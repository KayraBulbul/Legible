from fastapi import APIRouter

from api.dependencies import DatabaseSession
from api.schemas import GuestSessionResponse, SessionResponse, UserResponse
from api.services.auth import create_guest_session

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


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
