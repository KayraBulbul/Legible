import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from api.errors import AppError
from database.models import PairingCode, User, UserSession


@dataclass(frozen=True)
class IssuedSession:
    user: User
    session: UserSession
    access_token: str


@dataclass(frozen=True)
class AuthenticatedSession:
    user: User
    session: UserSession


SESSION_LIFETIME = timedelta(days=30)
PAIRING_CODE_LIFETIME = timedelta(minutes=10)
PAIRING_CODE_CREATION_LIMIT = 5
PAIRING_CODE_CREATION_WINDOW = timedelta(hours=1)
PAIRING_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
PAIRING_CODE_LENGTH = 8


def hash_access_token(access_token: str) -> str:
    return hashlib.sha256(access_token.encode("utf-8")).hexdigest()


def _new_session(user_id: UUID) -> tuple[UserSession, str]:
    access_token = secrets.token_urlsafe(32)
    return (
        UserSession(
            user_id=user_id,
            token_hash=hash_access_token(access_token),
            expires_at=datetime.now(UTC) + SESSION_LIFETIME,
        ),
        access_token,
    )


async def create_guest_session(database: AsyncSession) -> IssuedSession:
    user = User(kind="guest")
    database.add(user)
    await database.flush()
    user_session, access_token = _new_session(user.id)
    database.add(user_session)
    await database.commit()
    await database.refresh(user)
    await database.refresh(user_session)
    return IssuedSession(user=user, session=user_session, access_token=access_token)


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


async def update_user_display_name(
    database: AsyncSession, user: User, display_name: str | None
) -> None:
    user.display_name = display_name
    await database.commit()
    await database.refresh(user)


def hash_pairing_code(code: str, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), code.encode("ascii"), hashlib.sha256).hexdigest()


def _new_pairing_code() -> str:
    return "".join(secrets.choice(PAIRING_CODE_ALPHABET) for _ in range(PAIRING_CODE_LENGTH))


async def create_pairing_code(
    database: AsyncSession, user_id: UUID, secret: str
) -> tuple[PairingCode, str]:
    await database.execute(select(User.id).where(User.id == user_id).with_for_update())

    now = datetime.now(UTC)
    created_since = now - PAIRING_CODE_CREATION_WINDOW
    count_statement = (
        select(func.count())
        .select_from(PairingCode)
        .where(
            PairingCode.user_id == user_id,
            PairingCode.created_at >= created_since,
        )
    )
    created_count = int(await database.scalar(count_statement) or 0)
    if created_count >= PAIRING_CODE_CREATION_LIMIT:
        raise AppError(
            429,
            "pairing_rate_limited",
            "Too many pairing codes were created. Try again later.",
        )

    await database.execute(
        update(PairingCode)
        .where(
            PairingCode.user_id == user_id,
            PairingCode.redeemed_at.is_(None),
            PairingCode.invalidated_at.is_(None),
            PairingCode.expires_at > now,
        )
        .values(invalidated_at=now)
    )

    code = _new_pairing_code()
    pairing_code = PairingCode(
        user_id=user_id,
        code_hash=hash_pairing_code(code, secret),
        expires_at=now + PAIRING_CODE_LIFETIME,
    )
    database.add(pairing_code)
    await database.commit()
    await database.refresh(pairing_code)
    return pairing_code, code


def _invalid_pairing_code() -> AppError:
    return AppError(400, "invalid_pairing_code", "The pairing code is invalid or expired.")


async def redeem_pairing_code(database: AsyncSession, code: str, secret: str) -> IssuedSession:
    statement = (
        select(PairingCode)
        .where(PairingCode.code_hash == hash_pairing_code(code, secret))
        .with_for_update()
    )
    pairing_code = await database.scalar(statement)
    now = datetime.now(UTC)
    if (
        pairing_code is None
        or pairing_code.expires_at <= now
        or pairing_code.redeemed_at is not None
        or pairing_code.invalidated_at is not None
    ):
        raise _invalid_pairing_code()

    user = await database.get(User, pairing_code.user_id)
    if user is None:
        raise _invalid_pairing_code()

    user_session, access_token = _new_session(user.id)
    pairing_code.redeemed_at = now
    database.add(user_session)
    await database.commit()
    await database.refresh(user_session)
    return IssuedSession(user=user, session=user_session, access_token=access_token)
