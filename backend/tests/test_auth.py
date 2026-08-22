from datetime import UTC, datetime, timedelta

from httpx import AsyncClient


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
