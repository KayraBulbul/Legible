from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import get_settings
from api.errors import AppError
from api.services.ai import AiApplicationService
from api.services.auth import AuthenticatedSession, find_authenticated_session
from api.services.gemini import GoogleGeminiService
from api.services.pdf_exports import PdfExportService
from database.models import User
from database.session import get_database_session
from pdf.renderers import WeasyPrintRenderer

bearer_scheme = HTTPBearer(auto_error=False)

DatabaseSession = Annotated[AsyncSession, Depends(get_database_session)]


async def get_authenticated_session(
    database: DatabaseSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AuthenticatedSession:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(401, "authentication_required", "A valid bearer token is required.")

    authenticated = await find_authenticated_session(database, credentials.credentials)
    if authenticated is None:
        raise AppError(401, "invalid_access_token", "The access token is invalid or expired.")
    return authenticated


CurrentSession = Annotated[AuthenticatedSession, Depends(get_authenticated_session)]


async def get_current_user(authenticated: CurrentSession) -> User:
    return authenticated.user


CurrentUser = Annotated[User, Depends(get_current_user)]


@lru_cache
def get_pdf_export_service() -> PdfExportService:
    settings = get_settings()
    renderer = WeasyPrintRenderer(settings.pdf_render_timeout_seconds)
    return PdfExportService(renderer, settings.pdf_render_concurrency)


PdfExporter = Annotated[PdfExportService, Depends(get_pdf_export_service)]


@lru_cache
def get_ai_service() -> AiApplicationService:
    settings = get_settings()
    api_key = (
        settings.gemini_api_key.get_secret_value() if settings.gemini_api_key is not None else None
    )
    provider = GoogleGeminiService(
        api_key=api_key,
        model=settings.gemini_model,
        request_timeout_seconds=settings.ai_request_timeout_seconds,
    )
    return AiApplicationService(
        provider,
        timeout_seconds=settings.ai_request_timeout_seconds,
        concurrency=settings.ai_request_concurrency,
        capacity_wait_seconds=settings.ai_capacity_wait_seconds,
        requests_per_minute=settings.ai_requests_per_minute,
        requests_per_ip_per_minute=settings.ai_requests_per_ip_per_minute,
        global_requests_per_minute=settings.ai_global_requests_per_minute,
    )


AiService = Annotated[AiApplicationService, Depends(get_ai_service)]
