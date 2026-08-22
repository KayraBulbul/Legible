import hashlib
import secrets
from dataclasses import dataclass
from typing import cast

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import User, UserSession


@dataclass(frozen=True)
class CreatedGuestSession:
    user: User
    session: UserSession
    access_token: str


def hash_access_token(access_token: str) -> str:
    return hashlib.sha256(access_token.encode("utf-8")).hexdigest()


async def create_guest_session(database: AsyncSession) -> CreatedGuestSession:
    user = User(kind="guest")
    access_token = secrets.token_urlsafe(32)
    database.add(user)
    await database.flush()
    user_session = UserSession(user_id=user.id, token_hash=hash_access_token(access_token))
    database.add(user_session)
    await database.commit()
    await database.refresh(user)
    await database.refresh(user_session)
    return CreatedGuestSession(user=user, session=user_session, access_token=access_token)


async def find_user_for_access_token(database: AsyncSession, access_token: str) -> User | None:
    statement = (
        select(User)
        .join(UserSession, UserSession.user_id == User.id)
        .where(
            UserSession.token_hash == hash_access_token(access_token),
            UserSession.revoked_at.is_(None),
            or_(UserSession.expires_at.is_(None), UserSession.expires_at > func.now()),
        )
    )
    return cast(User | None, await database.scalar(statement))
