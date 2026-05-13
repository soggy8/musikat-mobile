import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAlbum, mediaUrl } from '@/api/client';
import { loadSession } from '@/lib/session';
import type { AlbumDetail, Session, TrackSummary } from '@/types/api';

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSession()
      .then(async (stored) => {
        setSession(stored);
        if (stored && id) {
          setAlbum(await getAlbum(stored, id));
        }
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!album || !session) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#1db954" />
      </SafeAreaView>
    );
  }

  const coverUri = album.cover_art ? mediaUrl(session, `/cover-art/${encodeURIComponent(album.cover_art)}`) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.albumHeader}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cover} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverPlaceholderText}>A</Text>
          </View>
        )}
        <View style={styles.albumText}>
          <Text style={styles.eyebrow}>Album</Text>
          <Text style={styles.title}>{album.name}</Text>
          <Text style={styles.subtitle}>{album.artist ?? 'Unknown Artist'}</Text>
          <Text style={styles.meta}>{album.tracks.length} songs</Text>
        </View>
      </View>

      <FlatList
        data={album.tracks}
        keyExtractor={(track) => track.id}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Tracks</Text>}
        renderItem={({ item }) => <TrackRow track={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function TrackRow({ track }: { track: TrackSummary }) {
  return (
    <Pressable
      style={styles.trackRow}
      onPress={() =>
        router.push({
          pathname: '/player/[id]',
          params: {
            id: track.id,
            title: track.title,
            artist: track.artist ?? '',
            album: track.album ?? '',
          },
        })
      }>
      <Text style={styles.trackNumber}>{track.track ?? '-'}</Text>
      <View style={styles.trackText}>
        <Text style={styles.trackTitle}>{track.title}</Text>
        <Text style={styles.subtitle}>{track.artist ?? 'Unknown Artist'} · {formatDuration(track.duration)}</Text>
      </View>
      <Text style={styles.playText}>Play</Text>
    </Pressable>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) {
    return '';
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remaining}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    backgroundColor: '#0b0b0b',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0b0b',
  },
  albumHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 26,
    alignItems: 'flex-end',
  },
  cover: {
    width: 132,
    height: 132,
    borderRadius: 12,
    backgroundColor: '#282828',
  },
  coverPlaceholder: {
    width: 132,
    height: 132,
    borderRadius: 12,
    backgroundColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    color: '#1db954',
    fontSize: 54,
    fontWeight: '900',
  },
  albumText: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  eyebrow: {
    color: '#1db954',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.6,
    marginTop: 3,
  },
  subtitle: {
    color: '#b3b3b3',
    marginTop: 4,
  },
  meta: {
    color: '#8b8b8b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 32,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    marginBottom: 6,
  },
  trackNumber: {
    width: 28,
    color: '#8b8b8b',
    textAlign: 'center',
    fontWeight: '700',
  },
  trackText: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  playText: {
    color: '#1db954',
    fontSize: 13,
    fontWeight: '900',
  },
  error: {
    color: '#ff6b6b',
    fontWeight: '700',
  },
});
