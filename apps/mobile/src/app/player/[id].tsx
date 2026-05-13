import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mediaUrl } from '@/api/client';
import { loadSession } from '@/lib/session';
import type { Session } from '@/types/api';

export default function PlayerRoute() {
  const params = useLocalSearchParams<{ id: string; title?: string; artist?: string; album?: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSession()
      .then(setSession)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!session || !params.id) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#1db954" />
      </SafeAreaView>
    );
  }

  return (
    <Player
      uri={mediaUrl(session, `/tracks/${encodeURIComponent(params.id)}/stream`)}
      title={params.title || 'Unknown Track'}
      artist={params.artist || 'Unknown Artist'}
      album={params.album || 'Unknown Album'}
    />
  );
}

function Player({ uri, title, artist, album }: { uri: string; title: string; artist: string; album: string }) {
  const player = useAudioPlayer(uri, { downloadFirst: false, updateInterval: 1000 });

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  }, []);

  function play() {
    player.setActiveForLockScreen(true, { title, artist, albumTitle: album });
    player.play();
  }

  function pause() {
    player.pause();
    player.setActiveForLockScreen(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.eyebrow}>Now Playing</Text>
      <View style={styles.hero}>
        <View style={styles.artwork}>
          <Text style={styles.note}>M</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{artist}</Text>
        <Text style={styles.subtitle}>{album}</Text>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>
      <View style={styles.controls}>
        <Pressable style={styles.secondaryButton} onPress={pause}>
          <Text style={styles.secondaryButtonText}>Pause</Text>
        </Pressable>
        <Pressable style={styles.playButton} onPress={play}>
          <Text style={styles.playButtonText}>Play</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
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
  eyebrow: {
    color: '#1db954',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  artwork: {
    width: 260,
    height: 260,
    borderRadius: 30,
    backgroundColor: '#1db954',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#1db954',
    shadowOpacity: 0.35,
    shadowRadius: 28,
  },
  note: {
    color: '#031307',
    fontSize: 96,
    fontWeight: '900',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#b3b3b3',
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 999,
    backgroundColor: '#333',
    marginTop: 28,
  },
  progressFill: {
    width: '38%',
    height: 5,
    borderRadius: 999,
    backgroundColor: '#1db954',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 28,
  },
  playButton: {
    backgroundColor: '#1db954',
    borderRadius: 999,
    paddingHorizontal: 42,
    paddingVertical: 17,
  },
  playButtonText: {
    color: '#031307',
    fontSize: 17,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: '#242424',
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  error: {
    color: '#ff6b6b',
    fontWeight: '700',
  },
});
