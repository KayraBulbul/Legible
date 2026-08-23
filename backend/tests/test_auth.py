import asyncio
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, update

from api.config import get_settings
from api.main import app
from database.models import PairingCode, User
from database.session import session_factory


async def test_guest_session_expires_in_thirty_days(client: AsyncClient) -> None:
    before = datetime.now(UTC) + timedelta(days=30)

    response = await client.post("/api/v1/auth/guest")

    after = datetime.now(UTC) + timedelta(days=30)
    assert response.status_code == 201
    expires_at = datetime.fromisoformat(response.json()["session"]["expiresAt"])
    assert before <= expires_at <= after


async def test_guest_session_creation_is_rate_limited_by_client(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = get_settings().model_copy(
        update={
            "guest_sessions_per_ip_per_hour": 2,
            "guest_sessions_global_per_hour": 100,
        }
    )
    monkeypatch.setattr("api.routes.auth.get_settings", lambda: settings)

    responses = [await client.post("/api/v1/auth/guest") for _ in range(3)]

    assert [response.status_code for response in responses] == [201, 201, 429]
    assert responses[-1].json()["error"]["code"] == "guest_session_rate_limited"
    async with session_factory() as database:
        assert await database.scalar(select(func.count()).select_from(User)) == 2


async def test_guest_session_creation_is_rate_limited_globally(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = get_settings().model_copy(
        update={
            "guest_sessions_per_ip_per_hour": 100,
            "guest_sessions_global_per_hour": 1,
        }
    )
    monkeypatch.setattr("api.routes.auth.get_settings", lambda: settings)
    other_transport = ASGITransport(app=app, client=("203.0.113.20", 4312))

    first = await client.post("/api/v1/auth/guest")
    async with AsyncClient(transport=other_transport, base_url="http://test") as other_client:
        limited = await other_client.post("/api/v1/auth/guest")

    assert first.status_code == 201
    assert limited.status_code == 429
    assert limited.json()["error"]["code"] == "guest_session_rate_limited"


async def test_guest_session_limit_uses_railway_client_address(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = get_settings().model_copy(
        update={
            "trusted_proxy_ips": "100.0.0.0/8",
            "guest_sessions_per_ip_per_hour": 1,
            "guest_sessions_global_per_hour": 100,
        }
    )
    monkeypatch.setattr("api.routes.auth.get_settings", lambda: settings)
    transport = ASGITransport(app=app, client=("100.64.0.10", 4312))

    async with AsyncClient(transport=transport, base_url="http://test") as proxy_client:
        first = await proxy_client.post(
            "/api/v1/auth/guest",
            headers={"X-Real-IP": "203.0.113.20"},
        )
        second = await proxy_client.post(
            "/api/v1/auth/guest",
            headers={"X-Real-IP": "203.0.113.21"},
        )

    assert first.status_code == 201
    assert second.status_code == 201


async def test_authenticated_user_can_read_self(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    payload = created.json()
    headers = {"Authorization": f"Bearer {payload['session']['accessToken']}"}

    response = await client.get("/api/v1/auth/me", headers=headers)

    assert response.status_code == 200
    assert response.json() == payload["user"]


async def test_authenticated_user_can_update_display_name(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    headers = {"Authorization": f"Bearer {created.json()['session']['accessToken']}"}

    updated = await client.patch(
        "/api/v1/auth/me",
        json={"displayName": "  Ada   Lovelace\n"},
        headers=headers,
    )
    read_back = await client.get("/api/v1/auth/me", headers=headers)

    assert updated.status_code == 200
    assert updated.json()["displayName"] == "Ada Lovelace"
    assert read_back.json() == updated.json()


async def test_authenticated_user_can_clear_display_name(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    headers = {"Authorization": f"Bearer {created.json()['session']['accessToken']}"}
    await client.patch("/api/v1/auth/me", json={"displayName": "Ada"}, headers=headers)

    response = await client.patch("/api/v1/auth/me", json={"displayName": None}, headers=headers)

    assert response.status_code == 200
    assert response.json()["displayName"] is None


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"displayName": " \n\t "},
        {"displayName": "a" * 121},
        {"displayName": "Ada\x00Lovelace"},
    ],
)
async def test_display_name_update_rejects_invalid_payloads(
    client: AsyncClient, payload: dict[str, object]
) -> None:
    created = await client.post("/api/v1/auth/guest")
    headers = {"Authorization": f"Bearer {created.json()['session']['accessToken']}"}

    response = await client.patch("/api/v1/auth/me", json=payload, headers=headers)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


async def test_display_name_update_requires_authentication(client: AsyncClient) -> None:
    response = await client.patch("/api/v1/auth/me", json={"displayName": "Ada"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"


async def test_display_name_is_shared_across_paired_sessions(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    original_headers = {"Authorization": f"Bearer {created.json()['session']['accessToken']}"}
    await client.patch("/api/v1/auth/me", json={"displayName": "Ada"}, headers=original_headers)
    code = (await client.post("/api/v1/auth/pairing-codes", headers=original_headers)).json()[
        "code"
    ]

    paired = await client.post("/api/v1/auth/pairing-codes/redeem", json={"code": code})
    paired_headers = {"Authorization": f"Bearer {paired.json()['session']['accessToken']}"}
    await client.patch("/api/v1/auth/me", json={"displayName": "Grace"}, headers=paired_headers)
    original_user = await client.get("/api/v1/auth/me", headers=original_headers)

    assert paired.status_code == 201
    assert paired.json()["user"]["displayName"] == "Ada"
    assert original_user.json()["displayName"] == "Grace"


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


async def test_concurrent_pairing_code_creation_is_serialized(client: AsyncClient) -> None:
    created = await client.post("/api/v1/auth/guest")
    headers = {"Authorization": f"Bearer {created.json()['session']['accessToken']}"}

    responses = await asyncio.gather(
        *(client.post("/api/v1/auth/pairing-codes", headers=headers) for _ in range(6))
    )

    assert sorted(response.status_code for response in responses) == [201, 201, 201, 201, 201, 429]
    async with session_factory() as database:
        pairing_codes = list(await database.scalars(select(PairingCode)))
    assert len(pairing_codes) == 5
    assert sum(code.invalidated_at is None for code in pairing_codes) == 1


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
