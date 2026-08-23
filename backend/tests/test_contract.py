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
    assert "/api/v1/saved-pages/{page_id}/export.pdf" in paths
    assert "/api/v1/transformations" in paths
    assert "/api/v1/image-descriptions" in paths


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


async def test_openapi_publishes_saved_page_update_contract(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    schemas = response.json()["components"]["schemas"]
    update = schemas["SavedPageUpdate"]
    assert set(update["properties"]) == {"title", "isFavourited", "tags"}
    assert update.get("required", []) == []
    assert update["properties"]["title"]["type"] == "string"
    assert update["properties"]["isFavourited"]["type"] == "boolean"
    assert update["properties"]["tags"]["type"] == "array"
    assert update["properties"]["tags"]["maxItems"] == 20
    assert schemas["SavedPageResponse"]["properties"]["isFavourited"]["type"] == "boolean"
    assert schemas["SavedPageResponse"]["properties"]["tags"]["type"] == "array"
    assert schemas["SavedPageSummary"]["properties"]["isFavourited"]["type"] == "boolean"
    assert schemas["SavedPageSummary"]["properties"]["tags"]["type"] == "array"


async def test_openapi_publishes_current_user_update_contract(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    schema = response.json()
    operation = schema["paths"]["/api/v1/auth/me"]["patch"]
    assert operation["requestBody"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/UserUpdate"
    }
    assert operation["responses"]["200"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/UserResponse"
    }

    display_name = schema["components"]["schemas"]["UserUpdate"]["properties"]["displayName"]
    string_schema = next(option for option in display_name["anyOf"] if option["type"] == "string")
    assert string_schema["maxLength"] == 120
    assert {"type": "null"} in display_name["anyOf"]

    expected_error = {"$ref": "#/components/schemas/ErrorResponse"}
    for status in ("401", "413", "422"):
        assert (
            operation["responses"][status]["content"]["application/json"]["schema"]
            == expected_error
        )


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


async def test_cors_preflight_allows_current_user_update(client: AsyncClient) -> None:
    origin = "http://localhost:5173"
    response = await client.options(
        "/api/v1/auth/me",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "PATCH",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "PATCH" in response.headers["access-control-allow-methods"]
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


async def test_openapi_publishes_guest_session_rate_limit(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    rate_limit = response.json()["paths"]["/api/v1/auth/guest"]["post"]["responses"]["429"]
    assert rate_limit["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ErrorResponse"
    }


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


async def test_openapi_publishes_pdf_export_contract(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    operation = response.json()["paths"]["/api/v1/saved-pages/{page_id}/export.pdf"]["get"]
    content_parameter = next(
        parameter for parameter in operation["parameters"] if parameter["name"] == "content"
    )
    assert content_parameter["required"] is False
    assert content_parameter["schema"]["default"] == "preferred"
    assert content_parameter["schema"]["$ref"] == "#/components/schemas/PdfContentMode"

    success = operation["responses"]["200"]
    assert success["content"]["application/pdf"]["schema"] == {
        "type": "string",
        "format": "binary",
    }
    assert set(success["headers"]) == {"Content-Disposition", "X-Exported-Content"}

    expected_error = {"$ref": "#/components/schemas/ErrorResponse"}
    for status in ("401", "404", "409", "413", "422", "502", "503"):
        schema = operation["responses"][status]["content"]["application/json"]["schema"]
        assert schema == expected_error


async def test_cors_exposes_pdf_download_headers(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/saved-pages/62f44fe6-e6d2-44cc-9b38-e2d49bd15ace/export.pdf",
        headers={"Origin": "http://localhost:5173"},
    )

    assert response.status_code == 401
    exposed = response.headers["access-control-expose-headers"].lower()
    assert "content-disposition" in exposed
    assert "x-exported-content" in exposed


async def test_openapi_publishes_ai_endpoint_contract(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    expected_error = {"$ref": "#/components/schemas/ErrorResponse"}

    transformations = paths["/api/v1/transformations"]["post"]
    assert transformations["requestBody"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/TransformationRequest"
    }
    assert transformations["responses"]["200"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/TransformationResponse"
    }
    for status in ("401", "413", "422", "429", "502", "503"):
        assert (
            transformations["responses"][status]["content"]["application/json"]["schema"]
            == expected_error
        )

    descriptions = paths["/api/v1/image-descriptions"]["post"]
    assert descriptions["requestBody"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ImageDescriptionRequest"
    }
    assert descriptions["responses"]["200"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ImageDescriptionResponse"
    }
    for status in ("401", "413", "415", "422", "429", "502", "503"):
        assert (
            descriptions["responses"][status]["content"]["application/json"]["schema"]
            == expected_error
        )
