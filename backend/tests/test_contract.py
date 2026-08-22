from httpx import AsyncClient


async def test_openapi_exposes_vertical_slice(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/health" in paths
    assert "/api/v1/auth/guest" in paths
    assert "/api/v1/saved-pages" in paths
    assert "/api/v1/saved-pages/{page_id}" in paths


async def test_openapi_publishes_custom_validation_envelope(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    schema = response.json()
    expected_response = {"$ref": "#/components/schemas/ErrorResponse"}
    operations = (
        schema["paths"]["/api/v1/saved-pages"]["post"],
        schema["paths"]["/api/v1/saved-pages"]["get"],
        schema["paths"]["/api/v1/saved-pages/{page_id}"]["get"],
    )

    for operation in operations:
        validation_schema = operation["responses"]["422"]["content"]["application/json"]["schema"]
        assert validation_schema == expected_response


async def test_openapi_requires_null_profile_id_on_create(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    profile_id = response.json()["components"]["schemas"]["SavedPageCreate"]["properties"][
        "profileId"
    ]
    assert profile_id["type"] == "null"
