from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    false,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from database.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    kind: Mapped[str] = mapped_column(String(32), nullable=False, default="guest")
    display_name: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class PairingCode(Base):
    __tablename__ = "pairing_codes"
    __table_args__ = (Index("ix_pairing_codes_user_created_at", "user_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    redeemed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    invalidated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SavedPage(Base):
    __tablename__ = "saved_pages"
    __table_args__ = (
        UniqueConstraint("user_id", "client_save_id", name="uq_saved_pages_user_client_save"),
        Index("ix_saved_pages_user_created_at", "user_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    client_save_id: Mapped[UUID] = mapped_column(nullable=False)
    original_url: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    is_favourited: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    source_document: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    transformed_document: Mapped[dict[str, Any] | None] = mapped_column(JSONB(none_as_null=True))
    accessibility_settings: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    transformations: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    profile_id: Mapped[UUID | None] = mapped_column()
    source_hash: Mapped[str] = mapped_column(String(71), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
