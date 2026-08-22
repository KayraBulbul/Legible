import asyncio
from datetime import UTC, datetime
from uuid import uuid4

import asyncpg  # type: ignore[import-untyped]
from alembic import command
from alembic.config import Config

from tests.conftest import TEST_DATABASE_URL


async def test_favourite_migration_preserves_existing_pages_and_downgrades() -> None:
    config = Config("alembic.ini")
    await asyncio.to_thread(command.downgrade, config, "20260822_0003")
    connection = await asyncpg.connect(
        TEST_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)
    )
    user_id = uuid4()
    page_id = uuid4()
    try:
        await connection.execute(
            "INSERT INTO users (id, kind) VALUES ($1, 'guest')",
            user_id,
        )
        await connection.execute(
            """
            INSERT INTO saved_pages (
                id, user_id, client_save_id, original_url, title, excerpt,
                source_document, accessibility_settings, transformations,
                source_hash, request_hash, captured_at
            ) VALUES (
                $1, $2, $3, 'https://example.com', 'Existing page', 'Excerpt',
                '{}'::jsonb, '{}'::jsonb, '[]'::jsonb,
                $4, $5, $6
            )
            """,
            page_id,
            user_id,
            uuid4(),
            "sha256:" + "a" * 64,
            "b" * 64,
            datetime(2026, 8, 22, tzinfo=UTC),
        )

        await asyncio.to_thread(command.upgrade, config, "head")
        is_favourited = await connection.fetchval(
            "SELECT is_favourited FROM saved_pages WHERE id = $1", page_id
        )
        nullable = await connection.fetchval(
            """
            SELECT is_nullable
            FROM information_schema.columns
            WHERE table_name = 'saved_pages' AND column_name = 'is_favourited'
            """
        )

        assert is_favourited is False
        assert nullable == "NO"

        await asyncio.to_thread(command.downgrade, config, "20260822_0003")
        column_exists = await connection.fetchval(
            """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'saved_pages' AND column_name = 'is_favourited'
            )
            """
        )
        assert column_exists is False
    finally:
        await connection.close()
        await asyncio.to_thread(command.upgrade, config, "head")
