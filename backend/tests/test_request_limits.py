from collections.abc import AsyncIterator

from httpx import AsyncClient


async def test_content_length_over_limit_is_rejected(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/pairing-codes/redeem",
        content=b"{}",
        headers={
            "Content-Length": "4097",
            "Origin": "http://localhost:5173",
        },
    )

    assert response.status_code == 413
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert response.json() == {
        "error": {
            "code": "payload_too_large",
            "message": "The request body is too large.",
        }
    }


async def test_streamed_body_over_limit_is_rejected(client: AsyncClient) -> None:
    async def chunks() -> AsyncIterator[bytes]:
        yield b"a" * 3000
        yield b"b" * 1097

    response = await client.post(
        "/api/v1/auth/pairing-codes/redeem",
        content=chunks(),
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "payload_too_large"
