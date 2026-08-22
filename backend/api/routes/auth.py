from typing import Any

from fastapi import APIRouter, Response

from api.dependencies import CurrentSession, DatabaseSession
from api.schemas import ErrorResponse, GuestSessionResponse, SessionResponse, UserResponse
from api.services.auth import create_guest_session, revoke_session

UNAUTHORIZED_RESPONSE: dict[int | str, dict[str, Any]] = {
    401: {"model": ErrorResponse, "description": "Authentication failed"}
}

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def user_response(authenticated: CurrentSession) -> UserResponse:
    return UserResponse(
        id=authenticated.user.id,
        kind="guest",
        display_name=authenticated.user.display_name,
        created_at=authenticated.user.created_at,
    )


@router.post("/guest", response_model=GuestSessionResponse, status_code=201)
async def create_guest(database: DatabaseSession) -> GuestSessionResponse:
    created = await create_guest_session(database)
    return GuestSessionResponse(
        user=UserResponse(
            id=created.user.id,
            kind="guest",
            display_name=created.user.display_name,
            created_at=created.user.created_at,
        ),
        session=SessionResponse(
            access_token=created.access_token,
            expires_at=created.session.expires_at,
        ),
    )


@router.get("/me", response_model=UserResponse, responses=UNAUTHORIZED_RESPONSE)
async def read_current_user(authenticated: CurrentSession) -> UserResponse:
    return user_response(authenticated)


@router.delete(
    "/session",
    status_code=204,
    response_class=Response,
    responses=UNAUTHORIZED_RESPONSE,
)
async def delete_current_session(
    database: DatabaseSession, authenticated: CurrentSession
) -> Response:
    await revoke_session(database, authenticated.session)
    return Response(status_code=204)
