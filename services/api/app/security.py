from __future__ import annotations

import hashlib
import hmac
import secrets


def create_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str, app_secret: str) -> str:
    return hmac.new(app_secret.encode(), token.encode(), hashlib.sha256).hexdigest()


def create_subsonic_salt() -> str:
    return secrets.token_hex(8)


def create_subsonic_token(password: str, salt: str) -> str:
    return hashlib.md5(f"{password}{salt}".encode(), usedforsecurity=False).hexdigest()
