from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any
from urllib.parse import urljoin

import httpx
from fastapi import HTTPException, status

from .config import Settings
from .database import Session
from .models import AlbumDetail, AlbumSummary, ArtistDetail, ArtistSummary, SearchResults, TrackSummary


class NavidromeClient:
    def __init__(self, settings: Settings, session: Session | None = None):
        self.settings = settings
        self.session = session

    async def ping_with_credentials(
        self,
        *,
        server_url: str,
        username: str,
        token: str,
        salt: str,
    ) -> None:
        await self._request_json(
            server_url=server_url,
            username=username,
            token=token,
            salt=salt,
            endpoint="ping",
        )

    async def get_artists(self) -> list[ArtistSummary]:
        payload = await self._session_json("getArtists")
        indexes = payload.get("artists", {}).get("index", [])
        artists: list[ArtistSummary] = []
        for index in indexes:
            for artist in index.get("artist", []):
                artists.append(_artist_summary(artist))
        return artists

    async def get_tracks(self, size: int = 50) -> list[TrackSummary]:
        payload = await self._session_json("getRandomSongs", size=size)
        songs = payload.get("randomSongs", {}).get("song", [])
        return [_track_summary(song) for song in songs]

    async def get_artist(self, artist_id: str) -> ArtistDetail:
        payload = await self._session_json("getArtist", id=artist_id)
        artist = payload.get("artist", {})
        return ArtistDetail(
            id=str(artist.get("id", artist_id)),
            name=str(artist.get("name", "Unknown Artist")),
            albums=[_album_summary(album) for album in artist.get("album", [])],
        )

    async def get_album(self, album_id: str) -> AlbumDetail:
        payload = await self._session_json("getAlbum", id=album_id)
        album = payload.get("album", {})
        return AlbumDetail(
            id=str(album.get("id", album_id)),
            name=str(album.get("name", "Unknown Album")),
            artist=album.get("artist"),
            cover_art=album.get("coverArt"),
            tracks=[_track_summary(track) for track in album.get("song", [])],
        )

    async def search(self, query: str) -> SearchResults:
        payload = await self._session_json("search3", query=query)
        results = payload.get("searchResult3", {})
        return SearchResults(
            artists=[_artist_summary(artist) for artist in results.get("artist", [])],
            albums=[_album_summary(album) for album in results.get("album", [])],
            tracks=[_track_summary(track) for track in results.get("song", [])],
        )

    @asynccontextmanager
    async def stream(self, endpoint: str, *, media_id: str, range_header: str | None = None) -> AsyncIterator[httpx.Response]:
        session = self._require_session()
        headers = {"Range": range_header} if range_header else None
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "GET",
                self._endpoint_url(session.server_url, endpoint),
                params=self._auth_params(session) | {"id": media_id},
                headers=headers,
            ) as response:
                if response.status_code >= 400:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Navidrome returned HTTP {response.status_code}",
                    )
                yield response

    async def _session_json(self, endpoint: str, **params: Any) -> dict[str, Any]:
        session = self._require_session()
        return await self._request_json(
            server_url=session.server_url,
            username=session.username,
            token=session.navidrome_token,
            salt=session.salt,
            endpoint=endpoint,
            **params,
        )

    async def _request_json(
        self,
        *,
        server_url: str,
        username: str,
        token: str,
        salt: str,
        endpoint: str,
        **params: Any,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                self._endpoint_url(server_url, endpoint),
                params=self._auth_params_for(username=username, token=token, salt=salt) | params,
            )
        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Navidrome returned HTTP {response.status_code}",
            )
        payload = response.json().get("subsonic-response", {})
        if payload.get("status") == "failed":
            error = payload.get("error", {})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error.get("message", "Navidrome authentication failed"),
            )
        return payload

    def _auth_params(self, session: Session) -> dict[str, str]:
        return self._auth_params_for(
            username=session.username,
            token=session.navidrome_token,
            salt=session.salt,
        )

    def _auth_params_for(self, *, username: str, token: str, salt: str) -> dict[str, str]:
        return {
            "u": username,
            "t": token,
            "s": salt,
            "v": self.settings.subsonic_api_version,
            "c": self.settings.client_name,
            "f": "json",
        }

    def _endpoint_url(self, server_url: str, endpoint: str) -> str:
        base = str(server_url).rstrip("/") + "/"
        return urljoin(base, f"rest/{endpoint}.view")

    def _require_session(self) -> Session:
        if self.session is None:
            raise RuntimeError("A saved session is required for this Navidrome operation")
        return self.session


def _artist_summary(data: dict[str, Any]) -> ArtistSummary:
    return ArtistSummary(
        id=str(data.get("id", "")),
        name=str(data.get("name", "Unknown Artist")),
        album_count=int(data.get("albumCount", 0) or 0),
    )


def _album_summary(data: dict[str, Any]) -> AlbumSummary:
    return AlbumSummary(
        id=str(data.get("id", "")),
        name=str(data.get("name", "Unknown Album")),
        artist=data.get("artist"),
        cover_art=data.get("coverArt"),
        song_count=int(data.get("songCount", data.get("childCount", 0)) or 0),
    )


def _track_summary(data: dict[str, Any]) -> TrackSummary:
    return TrackSummary(
        id=str(data.get("id", "")),
        title=str(data.get("title", "Unknown Track")),
        artist=data.get("artist"),
        album=data.get("album"),
        duration=data.get("duration"),
        track=data.get("track"),
        cover_art=data.get("coverArt"),
    )
