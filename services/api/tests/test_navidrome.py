from app.config import Settings
from app.database import Session
from app.navidrome import NavidromeClient


def make_client() -> NavidromeClient:
    return NavidromeClient(
        settings=Settings(),
        session=Session(
            token_hash="hash",
            server_url="https://music.example.test",
            username="andrej",
            navidrome_token="token",
            salt="salt",
        ),
    )


def test_auth_params_use_subsonic_token_auth() -> None:
    client = make_client()

    assert client._auth_params(client._require_session()) == {
        "u": "andrej",
        "t": "token",
        "s": "salt",
        "v": "1.16.1",
        "c": "Musikat",
        "f": "json",
    }


async def test_get_artists_maps_indexed_subsonic_response(monkeypatch) -> None:
    client = make_client()

    async def fake_session_json(endpoint: str, **params):
        assert endpoint == "getArtists"
        assert params == {}
        return {
            "artists": {
                "index": [
                    {"name": "A", "artist": [{"id": "artist-1", "name": "Artist One", "albumCount": 2}]},
                    {"name": "B", "artist": [{"id": "artist-2", "name": "Artist Two", "albumCount": 1}]},
                ]
            }
        }

    monkeypatch.setattr(client, "_session_json", fake_session_json)

    artists = await client.get_artists()

    assert [artist.id for artist in artists] == ["artist-1", "artist-2"]
    assert artists[0].album_count == 2


async def test_get_album_maps_tracks(monkeypatch) -> None:
    client = make_client()

    async def fake_session_json(endpoint: str, **params):
        assert endpoint == "getAlbum"
        assert params == {"id": "album-1"}
        return {
            "album": {
                "id": "album-1",
                "name": "Album One",
                "artist": "Artist One",
                "coverArt": "cover-1",
                "song": [
                    {
                        "id": "track-1",
                        "title": "Track One",
                        "artist": "Artist One",
                        "album": "Album One",
                        "duration": 245,
                        "track": 1,
                        "coverArt": "cover-1",
                    }
                ],
            }
        }

    monkeypatch.setattr(client, "_session_json", fake_session_json)

    album = await client.get_album("album-1")

    assert album.id == "album-1"
    assert album.cover_art == "cover-1"
    assert album.tracks[0].id == "track-1"
    assert album.tracks[0].duration == 245
