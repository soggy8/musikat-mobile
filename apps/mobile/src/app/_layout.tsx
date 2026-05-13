import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';

const musikatTheme = {
  dark: true,
  colors: {
    primary: '#1db954',
    background: '#0b0b0b',
    card: '#0b0b0b',
    text: '#ffffff',
    border: '#191919',
    notification: '#1db954',
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '600' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={musikatTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Musikat', headerShadowVisible: false }} />
        <Stack.Screen name="album/[id]" options={{ title: '', headerShadowVisible: false }} />
        <Stack.Screen
          name="player/[id]"
          options={{ title: '', presentation: 'modal', headerShadowVisible: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}
