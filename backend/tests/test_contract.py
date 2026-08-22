from httpx import AsyncClient


async def test_openapi_exposes_vertical_slice(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/health" in paths
    assert "/api/v1/auth/guest" in paths
    assert "/api/v1/saved-pages" in paths
    assert "/api/v1/saved-pages/{page_id}" in paths
