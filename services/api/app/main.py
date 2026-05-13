from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import Settings, get_settings
from .database import Session, SessionStore
from .models import (
    AlbumDetail,
    AlbumSummary,
    ArtistDetail,
    ArtistSummary,
    LoginRequest,
    LoginResponse,
    PlaylistSummary,
    SearchResults,
    TrackSummary,
)
from .navidrome import NavidromeClient
from .security import create_session_token, create_subsonic_salt, create_subsonic_token


app = FastAPI(title="Musikat API")


@app.on_event("startup")
def init_database() -> None:
    SessionStore(get_settings())


def get_store(settings: Settings = Depends(get_settings)) -> SessionStore:
    return SessionStore(settings)


def configure_cors() -> None:
    settings = get_settings()
    origins = [str(origin).rstrip("/") for origin in settings.cors_origins]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=bool(origins),
        allow_methods=["*"],
        allow_headers=["*"],
    )


configure_cors()


async def get_current_session(
    authorization: str | None = Header(default=None),
    access_token_query: str | None = Query(default=None, alias="access_token"),
    store: SessionStore = Depends(get_store),
) -> Session:
    if access_token_query:
        access_token = access_token_query
    elif authorization and authorization.lower().startswith("bearer "):
        access_token = authorization.split(" ", 1)[1].strip()
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    session = store.get_session(access_token)
    if session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token")
    return session


def get_navidrome_client(
    session: Session = Depends(get_current_session),
    settings: Settings = Depends(get_settings),
) -> NavidromeClient:
    return NavidromeClient(settings=settings, session=session)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    settings: Settings = Depends(get_settings),
    store: SessionStore = Depends(get_store),
) -> LoginResponse:
    salt = create_subsonic_salt()
    navidrome_token = create_subsonic_token(payload.password, salt)
    server_url = str(payload.server_url).rstrip("/")

    client = NavidromeClient(settings=settings)
    await client.ping_with_credentials(
        server_url=server_url,
        username=payload.username,
        token=navidrome_token,
        salt=salt,
    )

    access_token = create_session_token()
    store.save_session(
        access_token=access_token,
        server_url=server_url,
        username=payload.username,
        navidrome_token=navidrome_token,
        salt=salt,
    )
    return LoginResponse(access_token=access_token, username=payload.username, server_url=server_url)


@app.get("/library/artists", response_model=list[ArtistSummary])
async def get_artists(client: NavidromeClient = Depends(get_navidrome_client)) -> list[ArtistSummary]:
    return await client.get_artists()


@app.get("/library/tracks", response_model=list[TrackSummary])
async def get_tracks(
    client: NavidromeClient = Depends(get_navidrome_client),
) -> list[TrackSummary]:
    return await client.get_tracks()


@app.get("/library/albums", response_model=list[AlbumSummary])
async def get_albums(client: NavidromeClient = Depends(get_navidrome_client)) -> list[AlbumSummary]:
    return await client.get_albums()


@app.get("/library/playlists", response_model=list[PlaylistSummary])
async def get_playlists(client: NavidromeClient = Depends(get_navidrome_client)) -> list[PlaylistSummary]:
    return await client.get_playlists()


@app.get("/artists/{artist_id}", response_model=ArtistDetail)
async def get_artist(
    artist_id: str,
    client: NavidromeClient = Depends(get_navidrome_client),
) -> ArtistDetail:
    return await client.get_artist(artist_id)


@app.get("/albums/{album_id}", response_model=AlbumDetail)
async def get_album(
    album_id: str,
    client: NavidromeClient = Depends(get_navidrome_client),
) -> AlbumDetail:
    return await client.get_album(album_id)


@app.get("/search", response_model=SearchResults)
async def search(
    q: str = Query(min_length=1),
    client: NavidromeClient = Depends(get_navidrome_client),
) -> SearchResults:
    return await client.search(q)


@app.get("/tracks/{track_id}/stream")
async def stream_track(
    track_id: str,
    range_header: str | None = Header(default=None, alias="Range"),
    client: NavidromeClient = Depends(get_navidrome_client),
) -> StreamingResponse:
    return await _proxy_stream(client, "stream", track_id, range_header)


@app.get("/cover-art/{cover_art_id}")
async def cover_art(
    cover_art_id: str,
    client: NavidromeClient = Depends(get_navidrome_client),
) -> StreamingResponse:
    return await _proxy_stream(client, "getCoverArt", cover_art_id, None)


async def _proxy_stream(
    client: NavidromeClient,
    endpoint: str,
    media_id: str,
    range_header: str | None,
) -> StreamingResponse:
    stream_context = client.stream(endpoint, media_id=media_id, range_header=range_header)
    response = await stream_context.__aenter__()

    async def body() -> AsyncIterator[bytes]:
        try:
            async for chunk in response.aiter_bytes():
                yield chunk
        finally:
            await stream_context.__aexit__(None, None, None)

    headers = _forward_headers(response)
    media_type = response.headers.get("content-type", "application/octet-stream")
    return StreamingResponse(body(), status_code=response.status_code, media_type=media_type, headers=headers)


def _forward_headers(response) -> dict[str, str]:
    allowed = {
        "accept-ranges",
        "cache-control",
        "content-length",
        "content-range",
        "etag",
        "last-modified",
    }
    return {name: value for name, value in response.headers.items() if name.lower() in allowed}
