from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path

from .config import Settings
from .security import hash_session_token


@dataclass(frozen=True)
class Session:
    token_hash: str
    server_url: str
    username: str
    navidrome_token: str
    salt: str


class SessionStore:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.path = Path(settings.database_path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def _init_schema(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    server_url TEXT NOT NULL,
                    username TEXT NOT NULL,
                    navidrome_token TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

    def save_session(
        self,
        *,
        access_token: str,
        server_url: str,
        username: str,
        navidrome_token: str,
        salt: str,
    ) -> None:
        token_hash = hash_session_token(access_token, self.settings.app_secret)
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO sessions (
                    token_hash, server_url, username, navidrome_token, salt
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (token_hash, server_url, username, navidrome_token, salt),
            )

    def get_session(self, access_token: str) -> Session | None:
        token_hash = hash_session_token(access_token, self.settings.app_secret)
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT token_hash, server_url, username, navidrome_token, salt
                FROM sessions
                WHERE token_hash = ?
                """,
                (token_hash,),
            ).fetchone()
        if row is None:
            return None
        return Session(
            token_hash=row["token_hash"],
            server_url=row["server_url"],
            username=row["username"],
            navidrome_token=row["navidrome_token"],
            salt=row["salt"],
        )
