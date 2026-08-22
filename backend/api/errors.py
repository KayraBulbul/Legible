from collections.abc import Sequence

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHttpException

from api.schemas import ErrorDetail, ErrorField, ErrorResponse


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def error_content(
    code: str, message: str, fields: Sequence[ErrorField] | None = None
) -> dict[str, object]:
    response = ErrorResponse(
        error=ErrorDetail(code=code, message=message, fields=list(fields) if fields else None)
    )
    return response.model_dump(mode="json", by_alias=True, exclude_none=True)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_content(exc.code, exc.message),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        fields = [
            ErrorField(
                path=".".join(str(part) for part in error["loc"] if part != "body"),
                message=error["msg"],
            )
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=error_content("validation_error", "The request is invalid.", fields),
        )

    @app.exception_handler(StarletteHttpException)
    async def handle_http_error(_request: Request, exc: StarletteHttpException) -> JSONResponse:
        code = "not_found" if exc.status_code == 404 else "http_error"
        message = str(exc.detail) if exc.detail else "The request could not be completed."
        return JSONResponse(
            status_code=exc.status_code,
            content=error_content(code, message),
        )
