import { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, setAuthToken } from '@/lib/api';
import { colors, radii, shadows, gradients } from '@/lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [pairedAvatar, setPairedAvatar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const reqIdRef = useRef(0);

  const loadState = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        setAuthToken(token);
        try {
          const meResult = await authApi.getMe();
          if (reqId !== reqIdRef.current) return;
          setUser(meResult.user);
        } catch (err) {
          if (reqId !== reqIdRef.current) return;
          console.warn('getMe failed:', err);
          setUser(null);
        }
      }

      const paired = await AsyncStorage.getItem('paired_avatar');
      if (reqId !== reqIdRef.current) return;
      if (paired) {
        setPairedAvatar(JSON.parse(paired));
      }
    } catch (err) {
      console.warn('loadState failed:', err);
    }
    if (reqId === reqIdRef.current) setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadState();
    }, [loadState])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleNavigate = (path: string | { pathname: string; params?: Record<string, string | undefined> }) => {
    if (navigating) return;
    setNavigating(true);
    router.push(path as any);
    setTimeout(() => setNavigating(false), 500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>Uni</Text>
        <Text style={styles.subtitle}>重要的人，有你陪伴</Text>
      </View>

      <View style={styles.cardsContainer}>
        <TouchableOpacity activeOpacity={0.85} disabled={navigating} accessibilityLabel="管理分身" onPress={() => {
          if (user) {
            handleNavigate('/dashboard');
          } else {
            handleNavigate('/creator-login');
          }
        }}>
          <LinearGradient
            colors={gradients.primary as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardIconBox}>
              <Text style={styles.cardIcon}>👤</Text>
            </View>
            <Text style={styles.cardTitle}>管理分身</Text>
            <Text style={styles.cardDesc}>
              {user ? user.name : '创建你的数字分身'}
            </Text>
            <View style={styles.cardBtn}>
              <Text style={styles.cardBtnText}>
                {user ? '进入管理' : '立即创建'}
              </Text>
            </View>
            <View style={styles.arrowBadge}>
              <Text style={styles.arrowText}>›</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} disabled={navigating} accessibilityLabel="开始聊天" onPress={() => {
          if (pairedAvatar) {
            handleNavigate({
              pathname: '/chat/[avatarId]',
              params: {
                avatarId: String(pairedAvatar.avatarId),
                avatarName: pairedAvatar.avatarName,
                targetName: pairedAvatar.targetName,
                conversationId: pairedAvatar.conversationId ? String(pairedAvatar.conversationId) : undefined,
              },
            });
          } else {
            handleNavigate('/pairing');
          }
        }}>
          <LinearGradient
            colors={gradients.coral as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardIconBox}>
              <Text style={styles.cardIcon}>💬</Text>
            </View>
            <Text style={styles.cardTitle}>开始聊天</Text>
            <Text style={styles.cardDesc}>
              {pairedAvatar ? `正在和「${pairedAvatar.avatarName}」聊天` : '输入配对码，开始聊天'}
            </Text>
            <View style={styles.cardBtn}>
              <Text style={styles.cardBtnText}>
                {pairedAvatar ? '继续聊天' : '输入配对码'}
              </Text>
            </View>
            <View style={styles.arrowBadge}>
              <Text style={styles.arrowText}>›</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 34,
    marginBottom: 34,
    paddingHorizontal: 12,
  },
  appName: {
    fontSize: 58,
    lineHeight: 55,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 19,
    lineHeight: 28,
    color: colors.muted,
    fontWeight: '800',
  },
  cardsContainer: {
    gap: 14,
  },
  card: {
    borderRadius: radii.xl,
    padding: 20,
    minHeight: 174,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.52)',
    overflow: 'hidden',
    ...shadows.card,
  },
  cardIconBox: {
    width: 54,
    height: 54,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    overflow: 'hidden',
  },
  cardIcon: {
    fontSize: 27,
  },
  cardTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 7,
  },
  cardDesc: {
    fontSize: 16,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginBottom: 17,
  },
  cardBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  cardBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fff',
  },
  arrowBadge: {
    position: 'absolute',
    right: 22,
    bottom: 20,
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '600',
  },
});
