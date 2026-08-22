from collections.abc import AsyncIterator

from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from api.errors import error_content


class RequestBodyLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        content_length = self._content_length(scope)
        if content_length is not None and content_length > self.max_bytes:
            await self._reject(scope, receive, send)
            return

        messages: list[Message] = []
        received_bytes = 0
        while True:
            message = await receive()
            messages.append(message)
            if message["type"] != "http.request":
                break

            received_bytes += len(message.get("body", b""))
            if received_bytes > self.max_bytes:
                await self._reject(scope, receive, send)
                return
            if not message.get("more_body", False):
                break

        replay = self._replay(messages)
        await self.app(scope, replay.__anext__, send)

    @staticmethod
    def _content_length(scope: Scope) -> int | None:
        for name, value in scope.get("headers", []):
            if name.lower() != b"content-length":
                continue
            try:
                return int(value)
            except ValueError:
                return None
        return None

    @staticmethod
    async def _replay(messages: list[Message]) -> AsyncIterator[Message]:
        for message in messages:
            yield message
        while True:
            yield {"type": "http.request", "body": b"", "more_body": False}

    @staticmethod
    async def _reject(scope: Scope, receive: Receive, send: Send) -> None:
        response = JSONResponse(
            status_code=413,
            content=error_content(
                "payload_too_large",
                "The request body is too large.",
            ),
        )
        await response(scope, receive, send)
