import type { AlbumDetail, AlbumSummary, ArtistSummary, PlaylistSummary, SearchResults, Session, TrackSummary } from '@/types/api';

type LoginPayload = {
  backendUrl: string;
  serverUrl: string;
  username: string;
  password: string;
};

type LoginResponse = {
  access_token: string;
  username: string;
  server_url: string;
};

export async function login(payload: LoginPayload): Promise<Session> {
  const response = await fetch(apiUrl(payload.backendUrl, '/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      server_url: payload.serverUrl,
      username: payload.username,
      password: payload.password,
    }),
  });
  const data = await readJson<LoginResponse>(response);
  return {
    backendUrl: normalizeBaseUrl(payload.backendUrl),
    accessToken: data.access_token,
    username: data.username,
    serverUrl: data.server_url,
  };
}

export function getArtists(session: Session): Promise<ArtistSummary[]> {
  return request(session, '/library/artists');
}

export function getTracks(session: Session): Promise<TrackSummary[]> {
  return request(session, '/library/tracks');
}

export function getAlbums(session: Session): Promise<AlbumSummary[]> {
  return request(session, '/library/albums');
}

export function getPlaylists(session: Session): Promise<PlaylistSummary[]> {
  return request(session, '/library/playlists');
}

export function getAlbum(session: Session, albumId: string): Promise<AlbumDetail> {
  return request(session, `/albums/${encodeURIComponent(albumId)}`);
}

export function search(session: Session, query: string): Promise<SearchResults> {
  return request(session, `/search?q=${encodeURIComponent(query)}`);
}

export function mediaUrl(session: Session, path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${apiUrl(session.backendUrl, path)}${separator}access_token=${encodeURIComponent(session.accessToken)}`;
}

async function request<T>(session: Session, path: string): Promise<T> {
  const response = await fetch(apiUrl(session.backendUrl, path), {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  return readJson<T>(response);
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data && typeof data === 'object' && 'detail' in data ? String(data.detail) : response.statusText;
    throw new Error(detail || 'Request failed');
  }
  return data as T;
}

function apiUrl(baseUrl: string, path: string): string {
  return `${normalizeBaseUrl(baseUrl)}${path}`;
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}
