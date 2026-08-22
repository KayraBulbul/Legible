"""Expire user sessions.

Revision ID: 20260822_0002
Revises: 20260822_0001
Create Date: 2026-08-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260822_0002"
down_revision: str | None = "20260822_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "UPDATE user_sessions SET expires_at = now() + interval '30 days' WHERE expires_at IS NULL"
    )
    op.alter_column(
        "user_sessions",
        "expires_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "user_sessions",
        "expires_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=True,
    )
