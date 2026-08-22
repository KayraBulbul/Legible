import asyncio
from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy import select, update

from database.models import PairingCode
from database.session import session_factory


async def test_guest_session_expires_in_thirty_days(client: AsyncClient) -> None:
    before = datetime.now(UTC) + timedelta(days=30)

    response = await client.post("/api/v1/auth/guest")

    after = datetime.now(UTC) + timedelta(days=30)
    assert response.status_code == 201
    expires_at = datetime.fromisoformat(response.json()["session"]["expiresAt"])
    assert before <= expires_at <= after


async def test_authenticated_user_can_read_self(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    payload = created.json()
    headers = {"Authorization": f"Bearer {payload['session']['accessToken']}"}

    response = await client.get("/api/v1/auth/me", headers=headers)

    assert response.status_code == 200
    assert response.json() == payload["user"]


async def test_revoking_session_invalidates_its_token(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    headers = {"Authorization": f"Bearer {created.json()['session']['accessToken']}"}

    revoked = await client.delete("/api/v1/auth/session", headers=headers)
    rejected = await client.get("/api/v1/auth/me", headers=headers)

    assert revoked.status_code == 204
    assert revoked.content == b""
    assert rejected.status_code == 401
    assert rejected.json()["error"]["code"] == "invalid_access_token"


async def test_authentication_endpoints_require_bearer_token(client: AsyncClient) -> None:
    read_response = await client.get("/api/v1/auth/me")
    delete_response = await client.delete("/api/v1/auth/session")

    assert read_response.status_code == 401
    assert delete_response.status_code == 401


async def test_pairing_creates_another_session_for_same_user(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    original = created.json()
    original_token = original["session"]["accessToken"]
    headers = {"Authorization": f"Bearer {original_token}"}

    code_response = await client.post("/api/v1/auth/pairing-codes", headers=headers)
    code = code_response.json()["code"]
    paired = await client.post("/api/v1/auth/pairing-codes/redeem", json={"code": code})

    assert code_response.status_code == 201
    assert paired.status_code == 201
    assert paired.json()["user"] == original["user"]
    assert paired.json()["session"]["accessToken"] != original_token

    async with session_factory() as database:
        pairing_code = await database.scalar(select(PairingCode))
        assert pairing_code is not None
        assert pairing_code.code_hash != code
        assert pairing_code.redeemed_at is not None


async def test_pairing_code_can_only_be_redeemed_once(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    headers = {"Authorization": f"Bearer {created.json()['session']['accessToken']}"}
    code = (await client.post("/api/v1/auth/pairing-codes", headers=headers)).json()["code"]

    first = await client.post("/api/v1/auth/pairing-codes/redeem", json={"code": code})
    replay = await client.post("/api/v1/auth/pairing-codes/redeem", json={"code": code})

    assert first.status_code == 201
    assert replay.status_code == 400
    assert replay.json()["error"]["code"] == "invalid_pairing_code"


async def test_new_pairing_code_invalidates_previous_code(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    headers = {"Authorization": f"Bearer {created.json()['session']['accessToken']}"}
    old_code = (await client.post("/api/v1/auth/pairing-codes", headers=headers)).json()["code"]
    new_code = (await client.post("/api/v1/auth/pairing-codes", headers=headers)).json()["code"]

    old_response = await client.post("/api/v1/auth/pairing-codes/redeem", json={"code": old_code})
    new_response = await client.post("/api/v1/auth/pairing-codes/redeem", json={"code": new_code})

    assert old_response.status_code == 400
    assert new_response.status_code == 201


async def test_expired_pairing_code_is_rejected(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    headers = {"Authorization": f"Bearer {created.json()['session']['accessToken']}"}
    code = (await client.post("/api/v1/auth/pairing-codes", headers=headers)).json()["code"]
    async with session_factory() as database:
        await database.execute(
            update(PairingCode).values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
        )
        await database.commit()

    response = await client.post("/api/v1/auth/pairing-codes/redeem", json={"code": code})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_pairing_code"


async def test_pairing_code_creation_is_rate_limited(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    headers = {"Authorization": f"Bearer {created.json()['session']['accessToken']}"}

    responses = [await client.post("/api/v1/auth/pairing-codes", headers=headers) for _ in range(6)]

    assert [response.status_code for response in responses] == [201, 201, 201, 201, 201, 429]
    assert responses[-1].json()["error"]["code"] == "pairing_rate_limited"


async def test_pairing_redemption_is_rate_limited_by_client(client: AsyncClient) -> None:
    responses = [
        await client.post("/api/v1/auth/pairing-codes/redeem", json={"code": "23456789"})
        for _ in range(11)
    ]

    assert all(response.status_code == 400 for response in responses[:10])
    assert responses[-1].status_code == 429
    assert responses[-1].json()["error"]["code"] == "pairing_rate_limited"


async def test_concurrent_pairing_redemption_has_one_winner(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    headers = {"Authorization": f"Bearer {created.json()['session']['accessToken']}"}
    code = (await client.post("/api/v1/auth/pairing-codes", headers=headers)).json()["code"]

    responses = await asyncio.gather(
        client.post("/api/v1/auth/pairing-codes/redeem", json={"code": code}),
        client.post("/api/v1/auth/pairing-codes/redeem", json={"code": code}),
    )

    assert sorted(response.status_code for response in responses) == [201, 400]


async def test_revoking_one_session_does_not_revoke_paired_session(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    original_headers = {"Authorization": f"Bearer {created.json()['session']['accessToken']}"}
    code = (await client.post("/api/v1/auth/pairing-codes", headers=original_headers)).json()[
        "code"
    ]
    paired = await client.post("/api/v1/auth/pairing-codes/redeem", json={"code": code})
    paired_headers = {"Authorization": f"Bearer {paired.json()['session']['accessToken']}"}

    await client.delete("/api/v1/auth/session", headers=original_headers)
    original_me = await client.get("/api/v1/auth/me", headers=original_headers)
    paired_me = await client.get("/api/v1/auth/me", headers=paired_headers)

    assert original_me.status_code == 401
    assert paired_me.status_code == 200
    assert paired_me.json() == created.json()["user"]
