from typing import Any

from fastapi import APIRouter, Request, Response

from api.config import get_settings
from api.dependencies import CurrentSession, DatabaseSession
from api.rate_limits import pairing_redemption_limiter
from api.schemas import (
    ErrorResponse,
    GuestSessionResponse,
    PairingCodeRedeem,
    PairingCodeResponse,
    SessionResponse,
    UserResponse,
)
from api.services.auth import (
    IssuedSession,
    create_guest_session,
    create_pairing_code,
    redeem_pairing_code,
    revoke_session,
)

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


def issued_session_response(issued: IssuedSession) -> GuestSessionResponse:
    return GuestSessionResponse(
        user=UserResponse(
            id=issued.user.id,
            kind="guest",
            display_name=issued.user.display_name,
            created_at=issued.user.created_at,
        ),
        session=SessionResponse(
            access_token=issued.access_token,
            expires_at=issued.session.expires_at,
        ),
    )


@router.post("/guest", response_model=GuestSessionResponse, status_code=201)
async def create_guest(database: DatabaseSession) -> GuestSessionResponse:
    created = await create_guest_session(database)
    return issued_session_response(created)


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


@router.post(
    "/pairing-codes",
    response_model=PairingCodeResponse,
    status_code=201,
    responses={
        **UNAUTHORIZED_RESPONSE,
        429: {"model": ErrorResponse, "description": "Pairing rate limit reached"},
    },
)
async def create_code(
    database: DatabaseSession, authenticated: CurrentSession
) -> PairingCodeResponse:
    settings = get_settings()
    pairing_code, code = await create_pairing_code(
        database,
        authenticated.user.id,
        settings.pairing_code_secret,
    )
    return PairingCodeResponse(code=code, expires_at=pairing_code.expires_at)


@router.post(
    "/pairing-codes/redeem",
    response_model=GuestSessionResponse,
    status_code=201,
    responses={
        400: {"model": ErrorResponse, "description": "Pairing code is invalid"},
        422: {"model": ErrorResponse, "description": "Validation error"},
        429: {"model": ErrorResponse, "description": "Pairing rate limit reached"},
    },
)
async def redeem_code(
    payload: PairingCodeRedeem,
    request: Request,
    database: DatabaseSession,
) -> GuestSessionResponse:
    client_key = request.client.host if request.client is not None else "unknown"
    await pairing_redemption_limiter.consume(client_key)
    issued = await redeem_pairing_code(database, payload.code, get_settings().pairing_code_secret)
    return issued_session_response(issued)
