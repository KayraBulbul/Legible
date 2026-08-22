from copy import deepcopy
from typing import Any

from httpx import AsyncClient

from tests.helpers import create_guest_headers


async def test_guest_can_save_list_and_retrieve_page(
    client: AsyncClient, saved_page_payload: dict[str, Any]
) -> None:
    headers = await create_guest_headers(client)

    create_response = await client.post(
        "/api/v1/saved-pages", json=saved_page_payload, headers=headers
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["title"] == "Example article"
    assert created["sourceHash"].startswith("sha256:")
    assert len(created["sourceHash"]) == 71
    assert "<script" not in created["sourceDocument"]["html"]
    assert "onclick" not in created["sourceDocument"]["html"]
    assert created["accessibilitySettings"]["voiceURI"] is None

    list_response = await client.get("/api/v1/saved-pages", headers=headers)

    assert list_response.status_code == 200
    listing = list_response.json()
    assert listing["pagination"] == {"limit": 20, "offset": 0, "total": 1}
    assert listing["items"][0]["id"] == created["id"]
    assert listing["items"][0]["hasTransformedContent"] is False
    assert "sourceDocument" not in listing["items"][0]

    detail_response = await client.get(f"/api/v1/saved-pages/{created['id']}", headers=headers)

    assert detail_response.status_code == 200
    assert detail_response.json() == created


async def test_repeated_client_save_id_is_idempotent(
    client: AsyncClient, saved_page_payload: dict[str, Any]
) -> None:
    headers = await create_guest_headers(client)

    first = await client.post("/api/v1/saved-pages", json=saved_page_payload, headers=headers)
    replay = await client.post("/api/v1/saved-pages", json=saved_page_payload, headers=headers)

    assert first.status_code == 201
    assert replay.status_code == 200
    assert replay.json()["id"] == first.json()["id"]

    listing = await client.get("/api/v1/saved-pages", headers=headers)
    assert listing.json()["pagination"]["total"] == 1


async def test_reusing_client_save_id_for_different_payload_conflicts(
    client: AsyncClient, saved_page_payload: dict[str, Any]
) -> None:
    headers = await create_guest_headers(client)
    changed_payload = deepcopy(saved_page_payload)
    changed_payload["title"] = "Different title"

    first = await client.post("/api/v1/saved-pages", json=saved_page_payload, headers=headers)
    conflict = await client.post("/api/v1/saved-pages", json=changed_payload, headers=headers)

    assert first.status_code == 201
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "client_save_id_conflict"


async def test_saved_pages_require_authentication(
    client: AsyncClient, saved_page_payload: dict[str, Any]
) -> None:
    create_response = await client.post("/api/v1/saved-pages", json=saved_page_payload)
    list_response = await client.get("/api/v1/saved-pages")

    assert create_response.status_code == 401
    assert list_response.status_code == 401
    assert list_response.json()["error"]["code"] == "authentication_required"


async def test_user_cannot_retrieve_another_users_page(
    client: AsyncClient, saved_page_payload: dict[str, Any]
) -> None:
    owner_headers = await create_guest_headers(client)
    other_headers = await create_guest_headers(client)
    created = await client.post(
        "/api/v1/saved-pages", json=saved_page_payload, headers=owner_headers
    )

    response = await client.get(
        f"/api/v1/saved-pages/{created.json()['id']}", headers=other_headers
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "saved_page_not_found"


async def test_invalid_payload_uses_error_envelope(
    client: AsyncClient, saved_page_payload: dict[str, Any]
) -> None:
    headers = await create_guest_headers(client)
    invalid_payload = deepcopy(saved_page_payload)
    invalid_payload["originalUrl"] = "not-a-url"

    response = await client.post("/api/v1/saved-pages", json=invalid_payload, headers=headers)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert any(field["path"] == "originalUrl" for field in error["fields"])


async def test_naive_capture_timestamp_is_rejected(
    client: AsyncClient, saved_page_payload: dict[str, Any]
) -> None:
    headers = await create_guest_headers(client)
    invalid_payload = deepcopy(saved_page_payload)
    invalid_payload["capturedAt"] = "2026-08-22T04:31:00"

    response = await client.post("/api/v1/saved-pages", json=invalid_payload, headers=headers)

    assert response.status_code == 422
    assert any(field["path"] == "capturedAt" for field in response.json()["error"]["fields"])


async def test_original_url_credentials_are_rejected(
    client: AsyncClient, saved_page_payload: dict[str, Any]
) -> None:
    headers = await create_guest_headers(client)
    invalid_payload = deepcopy(saved_page_payload)
    invalid_payload["originalUrl"] = "https://username:password@example.com/article"

    response = await client.post("/api/v1/saved-pages", json=invalid_payload, headers=headers)

    assert response.status_code == 422
    assert any(field["path"] == "originalUrl" for field in response.json()["error"]["fields"])


async def test_profile_id_is_rejected_until_profiles_exist(
    client: AsyncClient, saved_page_payload: dict[str, Any]
) -> None:
    headers = await create_guest_headers(client)
    invalid_payload = deepcopy(saved_page_payload)
    invalid_payload["profileId"] = "4d3f60a5-6f8a-4b7c-af90-2905cc2cb7fb"

    response = await client.post("/api/v1/saved-pages", json=invalid_payload, headers=headers)

    assert response.status_code == 422
    assert any(field["path"] == "profileId" for field in response.json()["error"]["fields"])


async def test_unknown_page_returns_not_found(client: AsyncClient) -> None:
    headers = await create_guest_headers(client)

    response = await client.get(
        "/api/v1/saved-pages/62f44fe6-e6d2-44cc-9b38-e2d49bd15ace",
        headers=headers,
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "saved_page_not_found"


async def test_owner_can_rename_saved_page(
    client: AsyncClient, saved_page_payload: dict[str, Any]
) -> None:
    headers = await create_guest_headers(client)
    created = await client.post("/api/v1/saved-pages", json=saved_page_payload, headers=headers)

    response = await client.patch(
        f"/api/v1/saved-pages/{created.json()['id']}",
        json={"title": "  Renamed article  "},
        headers=headers,
    )
    listing = await client.get("/api/v1/saved-pages", headers=headers)

    assert response.status_code == 200
    assert response.json()["title"] == "Renamed article"
    assert listing.json()["items"][0]["title"] == "Renamed article"


async def test_blank_saved_page_title_is_rejected(
    client: AsyncClient, saved_page_payload: dict[str, Any]
) -> None:
    headers = await create_guest_headers(client)
    created = await client.post("/api/v1/saved-pages", json=saved_page_payload, headers=headers)

    response = await client.patch(
        f"/api/v1/saved-pages/{created.json()['id']}",
        json={"title": "   "},
        headers=headers,
    )

    assert response.status_code == 422
    assert any(field["path"] == "title" for field in response.json()["error"]["fields"])


async def test_owner_can_delete_saved_page(
    client: AsyncClient, saved_page_payload: dict[str, Any]
) -> None:
    headers = await create_guest_headers(client)
    created = await client.post("/api/v1/saved-pages", json=saved_page_payload, headers=headers)
    path = f"/api/v1/saved-pages/{created.json()['id']}"

    deleted = await client.delete(path, headers=headers)
    retrieved = await client.get(path, headers=headers)

    assert deleted.status_code == 204
    assert deleted.content == b""
    assert retrieved.status_code == 404


async def test_user_cannot_rename_or_delete_another_users_page(
    client: AsyncClient, saved_page_payload: dict[str, Any]
) -> None:
    owner_headers = await create_guest_headers(client)
    other_headers = await create_guest_headers(client)
    created = await client.post(
        "/api/v1/saved-pages", json=saved_page_payload, headers=owner_headers
    )
    path = f"/api/v1/saved-pages/{created.json()['id']}"

    renamed = await client.patch(path, json={"title": "Stolen"}, headers=other_headers)
    deleted = await client.delete(path, headers=other_headers)
    owner_read = await client.get(path, headers=owner_headers)

    assert renamed.status_code == 404
    assert deleted.status_code == 404
    assert owner_read.status_code == 200
    assert owner_read.json()["title"] == "Example article"
