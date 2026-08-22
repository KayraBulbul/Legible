import os
from collections.abc import AsyncIterator, Iterator
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://melbhack:melbhack@localhost:55432/melbhack_test",
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["ENVIRONMENT"] = "test"

from api.main import app  # noqa: E402
from database.session import engine  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def migrated_database() -> Iterator[None]:
    command.upgrade(Config("alembic.ini"), "head")
    yield


@pytest.fixture(autouse=True)
async def clean_database(migrated_database: None) -> AsyncIterator[None]:
    async with engine.begin() as connection:
        await connection.execute(text("TRUNCATE TABLE saved_pages, user_sessions, users CASCADE"))
    yield


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client


@pytest.fixture
def saved_page_payload() -> dict[str, Any]:
    return {
        "clientSaveId": "930e52f9-dd2d-461e-a7e6-b78cf7a6a47f",
        "originalUrl": "https://example.com/article",
        "title": "Example article",
        "capturedAt": "2026-08-22T04:31:00Z",
        "sourceDocument": {
            "format": "semantic_html",
            "html": (
                '<article onclick="steal()"><h1>Example article</h1>'
                "<script>alert(1)</script><p>Original content.</p></article>"
            ),
            "text": "Example article\n\nOriginal content.",
            "language": "en",
        },
        "transformedDocument": None,
        "accessibilitySettings": {
            "schemaVersion": 1,
            "dyslexiaFont": "lexend",
            "contrastMode": "light",
            "declutter": True,
            "fontScale": 120,
            "lineHeight": 1.8,
            "reducedMotion": True,
        },
        "transformations": [],
        "profileId": None,
    }
