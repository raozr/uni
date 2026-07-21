import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, setOnUnauthorized, authApi, avatarApi } from '@/lib/api';
import { colors, gradients, radii, shadows } from '@/lib/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setOnUnauthorized(() => {
      router.replace('/creator-login');
    });

    let cancelled = false;
    (async () => {
      const pairs = await AsyncStorage.multiGet(['auth_token', 'last_identity', 'paired_avatar']);
      const token = pairs[0][1];
      const lastIdentity = pairs[1][1];
      const paired = pairs[2][1];

      if (cancelled) return;

      if (token) setAuthToken(token);

      if (lastIdentity === 'chat' && paired) {
        try {
          const parsed = JSON.parse(paired);
          if (cancelled) return;
          setReady(true);
          router.replace({
            pathname: '/chat/[avatarId]',
            params: {
              avatarId: String(parsed.avatarId),
              avatarName: parsed.avatarName,
              targetName: parsed.targetName,
              conversationId: parsed.conversationId ? String(parsed.conversationId) : undefined,
            },
          });
          return;
        } catch (err) {
          console.warn('parse paired_avatar failed:', err);
          await AsyncStorage.multiRemove(['paired_avatar', 'pairing_token', 'last_identity']);
        }
      }

      if (lastIdentity === 'creator' && token) {
        try {
          await authApi.getMe();
          const { avatars } = await avatarApi.getAll();
          if (cancelled) return;
          if (avatars.length > 0) {
            setReady(true);
            router.replace('/dashboard');
            return;
          }
        } catch (err) {
          console.warn('auto login failed:', err);
          setAuthToken(null);
          await AsyncStorage.removeItem('auth_token');
        }
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      setOnUnauthorized(null);
    };
  }, []);

  if (!ready) {
    return (
      <LinearGradient colors={[...gradients.background]} style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <View style={styles.loadingContent}>
          <Text style={styles.loadingAppName}>Uni</Text>
          <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
          <Text style={styles.loadingSubtitle}>重要的人，有你陪伴</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[...gradients.background]} style={styles.container}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_right',
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingAppName: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 24,
  },
  loadingSubtitle: {
    fontSize: 19,
    color: colors.muted,
    fontWeight: '800',
  },
});
