import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import User, UserSession


@dataclass(frozen=True)
class CreatedGuestSession:
    user: User
    session: UserSession
    access_token: str


@dataclass(frozen=True)
class AuthenticatedSession:
    user: User
    session: UserSession


SESSION_LIFETIME = timedelta(days=30)


def hash_access_token(access_token: str) -> str:
    return hashlib.sha256(access_token.encode("utf-8")).hexdigest()


async def create_guest_session(database: AsyncSession) -> CreatedGuestSession:
    user = User(kind="guest")
    access_token = secrets.token_urlsafe(32)
    database.add(user)
    await database.flush()
    user_session = UserSession(
        user_id=user.id,
        token_hash=hash_access_token(access_token),
        expires_at=datetime.now(UTC) + SESSION_LIFETIME,
    )
    database.add(user_session)
    await database.commit()
    await database.refresh(user)
    await database.refresh(user_session)
    return CreatedGuestSession(user=user, session=user_session, access_token=access_token)


async def find_authenticated_session(
    database: AsyncSession, access_token: str
) -> AuthenticatedSession | None:
    statement = (
        select(User, UserSession)
        .join(UserSession, UserSession.user_id == User.id)
        .where(
            UserSession.token_hash == hash_access_token(access_token),
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > func.now(),
        )
    )
    row = (await database.execute(statement)).one_or_none()
    if row is None:
        return None
    return AuthenticatedSession(user=row.User, session=row.UserSession)


async def revoke_session(database: AsyncSession, session: UserSession) -> None:
    session.revoked_at = datetime.now(UTC)
    await database.commit()
