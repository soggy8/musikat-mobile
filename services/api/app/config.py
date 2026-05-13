from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Musikat API"
    app_secret: str = Field(default="change-me-in-development")
    client_name: str = "Musikat"
    subsonic_api_version: str = "1.16.1"
    database_path: str = "musikat.sqlite3"
    cors_origins: list[AnyHttpUrl] = []

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="MUSIKAT_",
        env_nested_delimiter="__",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
