import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getArtists, login, search } from '@/api/client';
import { clearSession, loadSession, saveSession } from '@/lib/session';
import type { AlbumSummary, ArtistSummary, SearchResults, Session, TrackSummary } from '@/types/api';

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSession()
      .then((stored) => {
        setSession(stored);
        if (stored) {
          return getArtists(stored).then(setArtists);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const albums = useMemo(() => results?.albums ?? [], [results]);
  const tracks = useMemo(() => results?.tracks ?? [], [results]);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const nextSession = await login({ backendUrl, serverUrl, username, password });
      await saveSession(nextSession);
      setSession(nextSession);
      setArtists(await getArtists(nextSession));
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
    setArtists([]);
    setResults(null);
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

  const libraryItems = [...albums, ...tracks, ...artists];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heroEyebrow}>Good listening</Text>
          <Text style={styles.title}>Your Library</Text>
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

      <FlatList
        data={libraryItems}
        keyExtractor={(item) => `${'title' in item ? 'track' : 'song_count' in item ? 'album' : 'artist'}-${item.id}`}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>{results ? 'Search results' : 'Artists'}</Text>
            <Text style={styles.sectionMeta}>{results ? `${libraryItems.length} matches` : `${artists.length} artists`}</Text>
          </View>
        }
        ListEmptyComponent={!loading ? <EmptyState hasQuery={Boolean(results)} /> : null}
        renderItem={({ item }) => renderLibraryItem(item)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
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

function renderLibraryItem(item: ArtistSummary | AlbumSummary | TrackSummary) {
  if ('title' in item) {
    return (
      <Pressable
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/player/[id]',
            params: { id: item.id, title: item.title, artist: item.artist ?? '', album: item.album ?? '' },
          })
        }>
        <View style={styles.artworkSmall}>
          <Text style={styles.artworkText}>T</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>Song · {item.artist ?? 'Unknown Artist'} · {item.album ?? 'Unknown Album'}</Text>
        </View>
        <Text style={styles.playGlyph}>Play</Text>
      </Pressable>
    );
  }

  if ('song_count' in item) {
    return (
      <Pressable style={styles.card} onPress={() => router.push({ pathname: '/album/[id]', params: { id: item.id } })}>
        <View style={styles.artworkSmall}>
          <Text style={styles.artworkText}>A</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>Album · {item.artist ?? 'Unknown Artist'} · {item.song_count} songs</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <View style={[styles.artworkSmall, styles.artistBubble]}>
        <Text style={styles.artworkText}>{item.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardMeta}>{item.album_count} albums</Text>
      </View>
    </View>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{hasQuery ? 'No results found' : 'No artists loaded yet'}</Text>
      <Text style={styles.emptyText}>
        {hasQuery ? 'Try a different search term.' : 'Connect to Navidrome and your artists will appear here.'}
      </Text>
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
    paddingBottom: 32,
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
});
