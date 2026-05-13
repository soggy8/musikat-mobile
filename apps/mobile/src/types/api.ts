export type Session = {
  backendUrl: string;
  accessToken: string;
  username: string;
  serverUrl: string;
};

export type ArtistSummary = {
  id: string;
  name: string;
  album_count: number;
};

export type AlbumSummary = {
  id: string;
  name: string;
  artist: string | null;
  cover_art: string | null;
  song_count: number;
};

export type TrackSummary = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  duration: number | null;
  track: number | null;
  cover_art: string | null;
};

export type PlaylistSummary = {
  id: string;
  name: string;
  song_count: number;
  duration: number | null;
  owner: string | null;
};

export type ArtistDetail = {
  id: string;
  name: string;
  albums: AlbumSummary[];
};

export type AlbumDetail = {
  id: string;
  name: string;
  artist: string | null;
  cover_art: string | null;
  tracks: TrackSummary[];
};

export type SearchResults = {
  artists: ArtistSummary[];
  albums: AlbumSummary[];
  tracks: TrackSummary[];
};
