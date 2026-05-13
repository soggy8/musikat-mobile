from __future__ import annotations

from pydantic import AnyHttpUrl, BaseModel, Field


class LoginRequest(BaseModel):
    server_url: AnyHttpUrl
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    server_url: str


class ArtistSummary(BaseModel):
    id: str
    name: str
    album_count: int = 0


class AlbumSummary(BaseModel):
    id: str
    name: str
    artist: str | None = None
    cover_art: str | None = None
    song_count: int = 0


class TrackSummary(BaseModel):
    id: str
    title: str
    artist: str | None = None
    album: str | None = None
    duration: int | None = None
    track: int | None = None
    cover_art: str | None = None


class ArtistDetail(BaseModel):
    id: str
    name: str
    albums: list[AlbumSummary]


class AlbumDetail(BaseModel):
    id: str
    name: str
    artist: str | None = None
    cover_art: str | None = None
    tracks: list[TrackSummary]


class SearchResults(BaseModel):
    artists: list[ArtistSummary]
    albums: list[AlbumSummary]
    tracks: list[TrackSummary]
