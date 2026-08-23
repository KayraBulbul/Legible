from functools import lru_cache
from ipaddress import ip_network
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "MelbHack Accessibility API"
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = Field(min_length=1)
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    pairing_code_secret: str = Field(min_length=32)
    trusted_proxy_ips: str = "127.0.0.1"
    guest_sessions_per_ip_per_hour: int = Field(default=60, ge=1)
    guest_sessions_global_per_hour: int = Field(default=1_000, ge=1)
    max_request_bytes: int = Field(default=20 * 1024 * 1024, ge=1024)
    pdf_render_timeout_seconds: float = Field(default=20, gt=0)
    pdf_render_concurrency: int = Field(default=2, ge=1)
    gemini_api_key: SecretStr | None = None
    gemini_model: str = Field(default="gemini-3.6-flash", min_length=1, max_length=120)
    ai_request_timeout_seconds: float = Field(default=30, gt=0)
    ai_request_concurrency: int = Field(default=2, ge=1)
    ai_capacity_wait_seconds: float = Field(default=2, gt=0)
    ai_requests_per_minute: int = Field(default=15, ge=1)
    ai_requests_per_ip_per_minute: int = Field(default=15, ge=1)
    ai_global_requests_per_minute: int = Field(default=15, ge=1)

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+asyncpg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    @field_validator("database_url")
    @classmethod
    def require_async_postgres(cls, value: str) -> str:
        if not value.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL must be a PostgreSQL URL")
        return value

    @field_validator("trusted_proxy_ips")
    @classmethod
    def require_trusted_proxy_networks(cls, value: str) -> str:
        networks = [network.strip() for network in value.split(",") if network.strip()]
        if not networks:
            raise ValueError("TRUSTED_PROXY_IPS must contain at least one IP or network")
        for network in networks:
            try:
                ip_network(network, strict=False)
            except ValueError as error:
                raise ValueError(
                    "TRUSTED_PROXY_IPS must contain only IP addresses or networks"
                ) from error
        return ",".join(networks)


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
