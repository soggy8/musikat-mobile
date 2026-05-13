import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAlbums, getPlaylists, getTracks, login, mediaUrl, search } from '@/api/client';
import { clearSession, loadSession, saveSession } from '@/lib/session';
import type { AlbumSummary, ArtistSummary, PlaylistSummary, SearchResults, Session, TrackSummary } from '@/types/api';

type ActiveTab = 'tracks' | 'albums' | 'playlists' | 'account';
type LibraryItem = AlbumSummary | ArtistSummary | PlaylistSummary | TrackSummary;

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [albumsLibrary, setAlbumsLibrary] = useState<AlbumSummary[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('tracks');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSession()
      .then((stored) => {
        setSession(stored);
        if (stored) {
          return loadTab(stored, 'tracks');
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const albums = useMemo(() => results?.albums ?? [], [results]);
  const searchTracks = useMemo(() => results?.tracks ?? [], [results]);
  const artists = useMemo(() => results?.artists ?? [], [results]);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const nextSession = await login({ backendUrl, serverUrl, username, password });
      await saveSession(nextSession);
      setSession(nextSession);
      setActiveTab('tracks');
      await loadTab(nextSession, 'tracks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!session || !query.trim()) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      setResults(await search(session, query.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await clearSession();
    setSession(null);
    setTracks([]);
    setAlbumsLibrary([]);
    setPlaylists([]);
    setResults(null);
  }

  async function loadTab(currentSession: Session, tab: ActiveTab) {
    setError(null);
    setLoading(true);
    try {
      if (tab === 'tracks') {
        setTracks(await getTracks(currentSession));
      } else if (tab === 'albums') {
        setAlbumsLibrary(await getAlbums(currentSession));
      } else if (tab === 'playlists') {
        setPlaylists(await getPlaylists(currentSession));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load library');
    } finally {
      setLoading(false);
    }
  }

  async function handleTabPress(tab: ActiveTab) {
    if (!session) {
      return;
    }
    setActiveTab(tab);
    setResults(null);
    setQuery('');
    if (tab === 'tracks' && tracks.length === 0) {
      await loadTab(session, tab);
    } else if (tab === 'albums' && albumsLibrary.length === 0) {
      await loadTab(session, tab);
    } else if (tab === 'playlists' && playlists.length === 0) {
      await loadTab(session, tab);
    }
  }

  if (loading && !session) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#1db954" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginShell}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>M</Text>
          </View>
          <Text style={styles.heroEyebrow}>Private streaming</Text>
          <Text style={styles.loginTitle}>Listen to your Navidrome library anywhere.</Text>
          <Text style={styles.loginSubtitle}>
            Connect once, then search albums and stream tracks through your Python backend.
          </Text>

          <View style={styles.formCard}>
            <LabeledInput label="Backend URL" value={backendUrl} onChangeText={setBackendUrl} placeholder="http://192.168.1.20:8000" />
            <LabeledInput label="Navidrome URL" value={serverUrl} onChangeText={setServerUrl} placeholder="https://music.example.com" />
            <LabeledInput label="Username" value={username} onChangeText={setUsername} placeholder="Your username" />
            <LabeledInput label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry />
            {error && <Text style={styles.error}>{error}</Text>}
            <PrimaryButton label={loading ? 'Connecting...' : 'Connect to music'} disabled={loading} onPress={handleLogin} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const libraryItems = getVisibleItems({
    activeTab,
    results,
    tracks,
    albums: albumsLibrary,
    playlists,
    searchTracks,
    searchAlbums: albums,
    searchArtists: artists,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heroEyebrow}>Good listening</Text>
          <Text style={styles.title}>{results ? 'Search' : tabTitle(activeTab)}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{session.username} · {session.serverUrl}</Text>
        </View>
        <Pressable style={styles.avatarButton} onPress={handleLogout}>
          <Text style={styles.avatarText}>{session.username.slice(0, 1).toUpperCase()}</Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>Search</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          placeholder="What do you want to hear?"
          placeholderTextColor="#8b8b8b"
          returnKeyType="search"
        />
        <Pressable style={[styles.searchButton, loading && styles.buttonDisabled]} disabled={loading} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Go</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator color="#1db954" />}

      <FlatList<LibraryItem>
        data={libraryItems}
        keyExtractor={(item) => `${itemType(item)}-${item.id}`}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>{results ? 'Search results' : tabSubtitle(activeTab)}</Text>
            <Text style={styles.sectionMeta}>{listCountLabel(activeTab, libraryItems.length, Boolean(results))}</Text>
          </View>
        }
        ListEmptyComponent={!loading && activeTab !== 'account' ? <EmptyState hasQuery={Boolean(results)} /> : null}
        renderItem={({ item }) => renderLibraryItem(item, session)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {activeTab === 'account' && !results && (
        <AccountPanel session={session} onLogout={handleLogout} />
      )}

      <BottomNav activeTab={activeTab} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

function getVisibleItems({
  activeTab,
  results,
  tracks,
  albums,
  playlists,
  searchTracks,
  searchAlbums,
  searchArtists,
}: {
  activeTab: ActiveTab;
  results: SearchResults | null;
  tracks: TrackSummary[];
  albums: AlbumSummary[];
  playlists: PlaylistSummary[];
  searchTracks: TrackSummary[];
  searchAlbums: AlbumSummary[];
  searchArtists: ArtistSummary[];
}): LibraryItem[] {
  if (results) {
    return [...searchTracks, ...searchAlbums, ...searchArtists];
  }
  if (activeTab === 'albums') {
    return albums;
  }
  if (activeTab === 'playlists') {
    return playlists;
  }
  if (activeTab === 'account') {
    return [];
  }
  return tracks;
}

function tabTitle(tab: ActiveTab) {
  const titles = {
    tracks: 'Tracks',
    albums: 'Albums',
    playlists: 'Playlists',
    account: 'Account',
  };
  return titles[tab];
}

function tabSubtitle(tab: ActiveTab) {
  const subtitles = {
    tracks: 'All tracks A-Z',
    albums: 'Albums A-Z',
    playlists: 'Your playlists',
    account: 'Your profile',
  };
  return subtitles[tab];
}

function listCountLabel(tab: ActiveTab, count: number, isSearch: boolean) {
  if (isSearch) {
    return `${count} matches`;
  }
  const labels = {
    tracks: 'tracks',
    albums: 'albums',
    playlists: 'playlists',
    account: 'items',
  };
  return `${count} ${labels[tab]}`;
}

function LabeledInput({
  label,
  ...inputProps
}: {
  label: string;
} & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor="#737373"
      />
    </View>
  );
}

function PrimaryButton({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.primaryButton, disabled && styles.buttonDisabled]} disabled={disabled} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function renderLibraryItem(item: ArtistSummary | AlbumSummary | PlaylistSummary | TrackSummary, session: Session) {
  if ('title' in item) {
    const coverUri = item.cover_art ? mediaUrl(session, `/cover-art/${encodeURIComponent(item.cover_art)}`) : null;
    return (
      <Pressable
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/player/[id]',
            params: { id: item.id, title: item.title, artist: item.artist ?? '', album: item.album ?? '' },
          })
        }>
        <CoverThumb uri={coverUri} label="T" />
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>Song · {item.artist ?? 'Unknown Artist'} · {item.album ?? 'Unknown Album'}</Text>
        </View>
        <Text style={styles.playGlyph}>Play</Text>
      </Pressable>
    );
  }

  if ('cover_art' in item) {
    const coverUri = item.cover_art ? mediaUrl(session, `/cover-art/${encodeURIComponent(item.cover_art)}`) : null;
    return (
      <Pressable style={styles.card} onPress={() => router.push({ pathname: '/album/[id]', params: { id: item.id } })}>
        <CoverThumb uri={coverUri} label="A" />
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>Album · {item.artist ?? 'Unknown Artist'} · {item.song_count} songs</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    );
  }

  return (
    <GenericLibraryRow item={item} />
  );
}

function itemType(item: LibraryItem) {
  if ('title' in item) {
    return 'track';
  }
  if ('cover_art' in item) {
    return 'album';
  }
  if ('duration' in item) {
    return 'playlist';
  }
  return 'artist';
}

function GenericLibraryRow({ item }: { item: ArtistSummary | PlaylistSummary }) {
  const isPlaylist = 'duration' in item;
  return (
    <View style={styles.card}>
      <View style={[styles.artworkSmall, isPlaylist ? styles.playlistBubble : styles.artistBubble]}>
        <Text style={styles.artworkText}>{item.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardMeta}>
          {isPlaylist ? `Playlist · ${item.song_count} songs` : `${item.album_count} albums`}
        </Text>
      </View>
    </View>
  );
}

function CoverThumb({ uri, label }: { uri: string | null; label: string }) {
  if (uri) {
    return <Image source={{ uri }} style={styles.artworkSmall} />;
  }
  return (
    <View style={styles.artworkSmall}>
      <Text style={styles.artworkText}>{label}</Text>
    </View>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{hasQuery ? 'No results found' : 'No tracks loaded yet'}</Text>
      <Text style={styles.emptyText}>
        {hasQuery ? 'Try a different search term.' : 'Connect to Navidrome and tracks with album art will appear here.'}
      </Text>
    </View>
  );
}

function AccountPanel({ session, onLogout }: { session: Session; onLogout: () => void }) {
  return (
    <View style={styles.accountCard}>
      <View style={styles.accountAvatar}>
        <Text style={styles.accountAvatarText}>{session.username.slice(0, 1).toUpperCase()}</Text>
      </View>
      <Text style={styles.accountName}>{session.username}</Text>
      <Text style={styles.accountMeta} numberOfLines={1}>{session.serverUrl}</Text>
      <PrimaryButton label="Log out" onPress={onLogout} />
    </View>
  );
}

function BottomNav({ activeTab, onTabPress }: { activeTab: ActiveTab; onTabPress: (tab: ActiveTab) => void }) {
  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'tracks', label: 'Tracks' },
    { id: 'albums', label: 'Albums' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'account', label: 'Account' },
  ];
  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Pressable key={tab.id} style={styles.navItem} onPress={() => onTabPress(tab.id)}>
            <View style={[styles.navDot, isActive && styles.navDotActive]} />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 18,
    backgroundColor: '#0b0b0b',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0b0b',
  },
  loginShell: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
  },
  brandMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1db954',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1db954',
    shadowOpacity: 0.35,
    shadowRadius: 22,
  },
  brandMarkText: {
    color: '#031307',
    fontSize: 30,
    fontWeight: '900',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroEyebrow: {
    color: '#1db954',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  loginTitle: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 42,
  },
  loginSubtitle: {
    color: '#b3b3b3',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 8,
  },
  formCard: {
    gap: 14,
    backgroundColor: '#181818',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#242424',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: '#b3b3b3',
    marginTop: 4,
    maxWidth: 260,
  },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1db954',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#031307',
    fontWeight: '900',
    fontSize: 18,
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    color: '#e5e5e5',
    fontWeight: '700',
  },
  input: {
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#282828',
    color: '#fff',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#1db954',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#031307',
    fontSize: 16,
    fontWeight: '900',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  searchIcon: {
    color: '#121212',
    fontSize: 12,
    fontWeight: '900',
  },
  searchInput: {
    flex: 1,
    color: '#121212',
    fontSize: 15,
    paddingVertical: 10,
  },
  searchButton: {
    backgroundColor: '#121212',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '900',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  listContent: {
    paddingBottom: 112,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  sectionMeta: {
    color: '#8b8b8b',
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  artworkSmall: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistBubble: {
    borderRadius: 28,
    backgroundColor: '#333',
  },
  playlistBubble: {
    borderRadius: 14,
    backgroundColor: '#301934',
  },
  artworkText: {
    color: '#1db954',
    fontSize: 20,
    fontWeight: '900',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  cardMeta: {
    color: '#b3b3b3',
    marginTop: 4,
  },
  playGlyph: {
    color: '#1db954',
    fontWeight: '900',
    fontSize: 13,
  },
  chevron: {
    color: '#b3b3b3',
    fontSize: 28,
    lineHeight: 30,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 52,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 20,
    marginBottom: 8,
  },
  emptyText: {
    color: '#8b8b8b',
    textAlign: 'center',
    lineHeight: 20,
  },
  error: {
    color: '#ff6b6b',
    fontWeight: '700',
  },
  accountCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 176,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#181818',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#242424',
    padding: 22,
  },
  accountAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1db954',
  },
  accountAvatarText: {
    color: '#031307',
    fontSize: 38,
    fontWeight: '900',
  },
  accountName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  accountMeta: {
    color: '#b3b3b3',
    maxWidth: '100%',
  },
  bottomNav: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#181818',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#282828',
    paddingVertical: 10,
  },
  navItem: {
    alignItems: 'center',
    gap: 5,
    minWidth: 68,
  },
  navDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  navDotActive: {
    backgroundColor: '#1db954',
  },
  navLabel: {
    color: '#8b8b8b',
    fontSize: 12,
    fontWeight: '800',
  },
  navLabelActive: {
    color: '#fff',
  },
});
