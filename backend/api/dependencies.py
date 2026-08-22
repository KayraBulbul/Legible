from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from api.errors import AppError
from api.services.auth import find_user_for_access_token
from database.models import User
from database.session import get_database_session

bearer_scheme = HTTPBearer(auto_error=False)

DatabaseSession = Annotated[AsyncSession, Depends(get_database_session)]


async def get_current_user(
    database: DatabaseSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(401, "authentication_required", "A valid bearer token is required.")

    user = await find_user_for_access_token(database, credentials.credentials)
    if user is None:
        raise AppError(401, "invalid_access_token", "The access token is invalid or expired.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
