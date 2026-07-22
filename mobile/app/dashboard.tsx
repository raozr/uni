import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ScrollView, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { avatarApi, setAuthToken } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/lib/theme';

export default function CreatorDashboardScreen() {
  const router = useRouter();
  const [avatars, setAvatars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const reqIdRef = useRef(0);

  useEffect(() => {
    AsyncStorage.setItem('last_identity', 'creator').catch((e) =>
      console.warn('save last_identity failed:', e)
    );
  }, []);

  const loadAvatars = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    try {
      const result = await avatarApi.getAll();
      if (reqId !== reqIdRef.current) return;
      setAvatars(result.avatars);
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      Alert.alert('错误', '获取分身列表失败');
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAvatars();
    }, [loadAvatars])
  );

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: async () => {
          setAuthToken(null);
          await AsyncStorage.multiRemove(['auth_token', 'user', 'last_identity']);
          router.replace('/');
        },
      },
    ]);
  };

  const handleShareCode = (avatar: any) => {
    Share.share({
      message: `Uni配对码：${avatar.pairing_code}\n\n下载 app 后输入这个配对码，就可以和 AI 聊天啦！`,
    }).catch(() => {});
  };

  if (loading) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>我的分身</Text>
              <Text style={styles.headerSubtitle}>
                {avatars.length > 0
                  ? `共 ${avatars.length} 个分身`
                  : '开始创建你的第一个分身'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.headerLogoutBtn}
              onPress={handleLogout}
              activeOpacity={0.6}
              accessibilityLabel="退出登录"
            >
              <Text style={styles.headerLogoutText}>退出</Text>
            </TouchableOpacity>
          </View>

          {avatars.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyInner}>
                <View style={styles.emptyIconCircle}>
                  <Text style={styles.emptyIcon}>🤖</Text>
                </View>
                <Text style={styles.emptyText}>还没有创建分身</Text>
                <Text style={styles.emptyHint}>
                  创建一个 AI 分身，让它替你陪伴重要的人
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/avatar-setup')}
                  activeOpacity={0.8}
                  style={styles.emptyBtn}
                  accessibilityLabel="创建第一个分身"
                >
                  <Text style={styles.emptyBtnText}>创建第一个分身</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            avatars.map((avatar: any, index: number) => (
              <View
                key={avatar.id}
                style={[styles.card, index > 0 && styles.cardGap]}
              >
                <View style={styles.avatarHeader}>
                  <View style={styles.avatarEmojiBox}>
                    <Text style={styles.avatarEmoji}>🤖</Text>
                  </View>
                  <Text style={styles.avatarName}>{avatar.name}</Text>
                </View>

                <View style={styles.infoLine}>
                  <Text style={styles.infoLabel}>聊天对象</Text>
                  <Text style={styles.infoValue}>{avatar.target_name}</Text>
                </View>

                <View style={styles.infoLine}>
                  <Text style={styles.infoLabel}>配对码</Text>
                  <Text style={styles.pairingCode}>{avatar.pairing_code}</Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push({
                      pathname: '/chat/[avatarId]',
                      params: {
                        avatarId: String(avatar.id),
                        avatarName: avatar.name,
                        targetName: avatar.target_name,
                        isCreator: 'true',
                      },
                    })}
                    activeOpacity={0.6}
                    accessibilityLabel={`查看与${avatar.target_name}的聊天`}
                  >
                    <Text style={styles.actionBtnText}>查看聊天</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push({
                      pathname: '/memories/[avatarId]',
                      params: { avatarId: String(avatar.id) },
                    })}
                    activeOpacity={0.6}
                    accessibilityLabel={`${avatar.name}的记忆管理`}
                  >
                    <Text style={styles.actionBtnText}>记忆管理</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push({
                      pathname: '/preset-answers/[avatarId]',
                      params: { avatarId: String(avatar.id) },
                    })}
                    activeOpacity={0.6}
                    accessibilityLabel={`${avatar.name}的预设问答`}
                  >
                    <Text style={styles.actionBtnText}>预设问答</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push({
                      pathname: '/unknown-queries/[avatarId]',
                      params: { avatarId: String(avatar.id) },
                    })}
                    activeOpacity={0.6}
                    accessibilityLabel={`${avatar.name}的未知问题`}
                  >
                    <Text style={styles.actionBtnText}>未知问题</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push({
                      pathname: '/avatar-setup',
                      params: { avatarId: String(avatar.id) },
                    })}
                    activeOpacity={0.6}
                    accessibilityLabel={`编辑${avatar.name}`}
                  >
                    <Text style={styles.actionBtnText}>编辑</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleShareCode(avatar)}
                    activeOpacity={0.6}
                    accessibilityLabel={`分享${avatar.name}的配对码`}
                  >
                    <Text style={styles.actionBtnText}>分享码</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            onPress={() => router.push('/avatar-setup')}
            activeOpacity={0.8}
            style={styles.dashCreateBtn}
            accessibilityLabel="新建分身"
          >
            <Text style={styles.createBtnIcon}>+</Text>
            <Text style={styles.createBtnText}>新建分身</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dashLogoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
            accessibilityLabel="退出登录"
          >
            <Text style={styles.logoutBtnText}>退出登录</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '700',
  },
  headerLogoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 4,
  },
  headerLogoutText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '900',
  },

  emptyCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    marginTop: 40,
  },
  emptyInner: {
    padding: 36,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryTrack,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(20,109,114,0.18)',
  },
  emptyIcon: {
    fontSize: 38,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  emptyBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 999,
    backgroundColor: colors.primary,
    shadowColor: '#146d72',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },

  card: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 20,
  },
  cardGap: {
    marginTop: 16,
  },

  avatarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarEmojiBox: {
    width: 42,
    height: 42,
    borderRadius: 18,
    backgroundColor: colors.primaryTrack,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },
  avatarEmoji: {
    fontSize: 23,
  },
  avatarName: {
    fontSize: 21,
    fontWeight: '900',
    color: colors.ink,
  },

  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
    gap: 12,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  infoValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  pairingCode: {
    color: colors.primary2,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 4,
  },

  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    borderRadius: 999,
    backgroundColor: colors.primaryTrack,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionBtnText: {
    color: colors.primary2,
    fontSize: 13,
    fontWeight: '900',
  },

  dashCreateBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 24,
    gap: 6,
  },
  createBtnIcon: {
    color: colors.primary2,
    fontSize: 24,
    fontWeight: '900',
  },
  createBtnText: {
    color: colors.primary2,
    fontSize: 17,
    fontWeight: '900',
  },

  dashLogoutBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 12,
  },
  logoutBtnText: {
    color: colors.danger,
    fontSize: 17,
    fontWeight: '900',
  },

  bottomSpacer: {
    height: 32,
  },
});
