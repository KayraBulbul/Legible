import asyncio

import asyncpg  # type: ignore[import-untyped]
from alembic import command
from alembic.config import Config

from tests.conftest import TEST_DATABASE_URL


async def test_rate_limit_migration_upgrades_and_downgrades() -> None:
    config = Config("alembic.ini")
    await asyncio.to_thread(command.downgrade, config, "20260822_0004")
    connection = await asyncpg.connect(
        TEST_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)
    )
    try:
        before_upgrade = await connection.fetchval(
            "SELECT to_regclass('public.rate_limit_buckets')"
        )
        assert before_upgrade is None

        await asyncio.to_thread(command.upgrade, config, "head")
        after_upgrade = await connection.fetchval("SELECT to_regclass('public.rate_limit_buckets')")
        assert after_upgrade == "rate_limit_buckets"

        await asyncio.to_thread(command.downgrade, config, "20260822_0004")
        after_downgrade = await connection.fetchval(
            "SELECT to_regclass('public.rate_limit_buckets')"
        )
        assert after_downgrade is None
    finally:
        await connection.close()
        await asyncio.to_thread(command.upgrade, config, "head")
