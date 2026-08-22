from httpx import AsyncClient


async def create_guest_headers(client: AsyncClient) -> dict[str, str]:
    response = await client.post("/api/v1/auth/guest")
    assert response.status_code == 201
    access_token = response.json()["session"]["accessToken"]
    return {"Authorization": f"Bearer {access_token}"}
