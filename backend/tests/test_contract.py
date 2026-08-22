import pytest
from httpx import AsyncClient


async def test_openapi_exposes_vertical_slice(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/health" in paths
    assert "/api/v1/auth/guest" in paths
    assert "/api/v1/auth/me" in paths
    assert "/api/v1/auth/session" in paths
    assert "/api/v1/auth/pairing-codes" in paths
    assert "/api/v1/auth/pairing-codes/redeem" in paths
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
        schema["paths"]["/api/v1/saved-pages/{page_id}"]["patch"],
        schema["paths"]["/api/v1/saved-pages/{page_id}"]["delete"],
    )

    for operation in operations:
        validation_schema = operation["responses"]["422"]["content"]["application/json"]["schema"]
        assert validation_schema == expected_response


async def test_openapi_publishes_idempotent_saved_page_response(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    create_responses = response.json()["paths"]["/api/v1/saved-pages"]["post"]["responses"]
    expected = {"$ref": "#/components/schemas/SavedPageResponse"}
    assert create_responses["200"]["content"]["application/json"]["schema"] == expected
    assert create_responses["201"]["content"]["application/json"]["schema"] == expected


async def test_openapi_publishes_saved_page_favourite_contract(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    schemas = response.json()["components"]["schemas"]
    update = schemas["SavedPageUpdate"]
    assert set(update["properties"]) == {"title", "isFavourited"}
    assert update.get("required", []) == []
    assert update["properties"]["title"]["type"] == "string"
    assert update["properties"]["isFavourited"]["type"] == "boolean"
    assert schemas["SavedPageResponse"]["properties"]["isFavourited"]["type"] == "boolean"
    assert schemas["SavedPageSummary"]["properties"]["isFavourited"]["type"] == "boolean"


@pytest.mark.parametrize("method", ["PATCH", "DELETE"])
async def test_cors_preflight_allows_saved_page_writes(client: AsyncClient, method: str) -> None:
    origin = "http://localhost:5173"
    response = await client.options(
        "/api/v1/saved-pages/62f44fe6-e6d2-44cc-9b38-e2d49bd15ace",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert method in response.headers["access-control-allow-methods"]
    assert "Authorization" in response.headers["access-control-allow-headers"]


async def test_openapi_requires_null_profile_id_on_create(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    profile_id = response.json()["components"]["schemas"]["SavedPageCreate"]["properties"][
        "profileId"
    ]
    assert profile_id["type"] == "null"


async def test_openapi_publishes_pairing_error_envelopes(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    expected = {"$ref": "#/components/schemas/ErrorResponse"}
    create_responses = paths["/api/v1/auth/pairing-codes"]["post"]["responses"]
    redeem_responses = paths["/api/v1/auth/pairing-codes/redeem"]["post"]["responses"]

    assert create_responses["401"]["content"]["application/json"]["schema"] == expected
    assert create_responses["429"]["content"]["application/json"]["schema"] == expected
    for status in ("400", "413", "422", "429"):
        assert redeem_responses[status]["content"]["application/json"]["schema"] == expected


async def test_openapi_publishes_payload_limit_for_saved_pages(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    expected = {"$ref": "#/components/schemas/ErrorResponse"}
    for method in ("post", "get"):
        schema = paths["/api/v1/saved-pages"][method]["responses"]["413"]["content"][
            "application/json"
        ]["schema"]
        assert schema == expected
    for method in ("get", "patch", "delete"):
        schema = paths["/api/v1/saved-pages/{page_id}"][method]["responses"]["413"]["content"][
            "application/json"
        ]["schema"]
        assert schema == expected
