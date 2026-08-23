import hashlib
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from api.errors import AppError
from database.models import RateLimitBucket


@dataclass(frozen=True)
class RateLimitRule:
    key: str
    limit: int
    window: timedelta


def rate_limit_key(scope: str, subject: str) -> str:
    subject_hash = hashlib.sha256(subject.encode("utf-8")).hexdigest()
    return f"{scope}:{subject_hash}"


async def consume_rate_limits(
    database: AsyncSession,
    rules: Sequence[RateLimitRule],
    *,
    error_code: str,
    error_message: str,
) -> None:
    now = datetime.now(UTC)
    ordered_rules = sorted(rules, key=lambda rule: rule.key)
    await database.execute(
        insert(RateLimitBucket)
        .values(
            [
                {
                    "key": rule.key,
                    "request_count": 0,
                    "expires_at": now + rule.window,
                }
                for rule in ordered_rules
            ]
        )
        .on_conflict_do_nothing(index_elements=["key"])
    )

    buckets = list(
        await database.scalars(
            select(RateLimitBucket)
            .where(RateLimitBucket.key.in_([rule.key for rule in ordered_rules]))
            .order_by(RateLimitBucket.key)
            .with_for_update()
        )
    )
    buckets_by_key = {bucket.key: bucket for bucket in buckets}

    for rule in ordered_rules:
        bucket = buckets_by_key[rule.key]
        if bucket.expires_at <= now:
            bucket.request_count = 0
            bucket.expires_at = now + rule.window
        if bucket.request_count >= rule.limit:
            raise AppError(429, error_code, error_message)

    for rule in ordered_rules:
        buckets_by_key[rule.key].request_count += 1
    await database.commit()
