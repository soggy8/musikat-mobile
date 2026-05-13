from app.config import Settings
from app.database import SessionStore
from app.security import create_subsonic_token


def test_create_subsonic_token_matches_expected_md5() -> None:
    assert create_subsonic_token("password", "salt") == "b305cadbb3bce54f3aa59c64fec00dea"


def test_session_store_round_trip(tmp_path) -> None:
    settings = Settings(app_secret="test-secret", database_path=str(tmp_path / "sessions.sqlite3"))
    store = SessionStore(settings)

    store.save_session(
        access_token="mobile-token",
        server_url="https://music.example.test",
        username="andrej",
        navidrome_token="subsonic-token",
        salt="abc123",
    )

    session = store.get_session("mobile-token")

    assert session is not None
    assert session.server_url == "https://music.example.test"
    assert session.username == "andrej"
    assert session.navidrome_token == "subsonic-token"
    assert session.salt == "abc123"
    assert store.get_session("wrong-token") is None
