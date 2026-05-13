from app.config import Settings
from app.database import Session
from app.models import AlbumDetail, AlbumSummary, ArtistDetail, ArtistSummary
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


async def test_get_tracks_traverses_library_and_sorts_alphabetically(monkeypatch) -> None:
    client = make_client()

    async def fake_get_artists():
        return [ArtistSummary(id="artist-1", name="Artist One", album_count=1)]

    async def fake_get_artist(artist_id: str):
        assert artist_id == "artist-1"
        return ArtistDetail(
            id="artist-1",
            name="Artist One",
            albums=[AlbumSummary(id="album-1", name="Album One", artist="Artist One", cover_art="cover-1")],
        )

    async def fake_get_album(album_id: str):
        assert album_id == "album-1"
        return AlbumDetail(
            id="album-1",
            name="Album One",
            artist="Artist One",
            cover_art="cover-1",
            tracks=[
                {"id": "track-2", "title": "Beta", "artist": "Artist One", "album": "Album One", "cover_art": "cover-1"},
                {"id": "track-1", "title": "Alpha", "artist": "Artist One", "album": "Album One", "cover_art": "cover-1"},
            ],
        )

    monkeypatch.setattr(client, "get_artists", fake_get_artists)
    monkeypatch.setattr(client, "get_artist", fake_get_artist)
    monkeypatch.setattr(client, "get_album", fake_get_album)

    tracks = await client.get_tracks()

    assert tracks[0].id == "track-1"
    assert tracks[1].id == "track-2"


async def test_get_playlists_maps_subsonic_response(monkeypatch) -> None:
    client = make_client()

    async def fake_session_json(endpoint: str, **params):
        assert endpoint == "getPlaylists"
        assert params == {}
        return {
            "playlists": {
                "playlist": [
                    {"id": "playlist-1", "name": "Favorites", "songCount": 12, "duration": 3200, "owner": "andrej"}
                ]
            }
        }

    monkeypatch.setattr(client, "_session_json", fake_session_json)

    playlists = await client.get_playlists()

    assert playlists[0].id == "playlist-1"
    assert playlists[0].song_count == 12
