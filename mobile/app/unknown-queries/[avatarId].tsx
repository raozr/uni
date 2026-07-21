import { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { unknownApi } from '@/lib/api';
import NavBar from '@/lib/components/NavBar';
import { colors, gradients, radii } from '@/lib/theme';

export default function UnknownQueriesScreen() {
  const { avatarId } = useLocalSearchParams<{ avatarId: string }>();
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showAnswered, setShowAnswered] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [responding, setResponding] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  const cancelledRef = useRef(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    cancelledRef.current = false;
    setPage(1);
    setHasMore(true);
    const reqId = ++reqIdRef.current;
    loadQueries(reqId, 1).catch(() => {});
    return () => { cancelledRef.current = true; };
  }, [showAnswered]);

  const loadQueries = async (reqId: number, pageNum: number) => {
    try {
      const result = await unknownApi.getList(showAnswered);
      if (cancelledRef.current || reqId !== reqIdRef.current) return;
      const allQueries = result.queries || [];
      if (pageNum === 1) {
        setQueries(allQueries.slice(0, PAGE_SIZE));
      } else {
        setQueries(prev => [...prev, ...allQueries.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE)]);
      }
      setHasMore(allQueries.length > pageNum * PAGE_SIZE);
      setPage(pageNum);
    } catch {
      if (!cancelledRef.current && reqId === reqIdRef.current) Alert.alert('错误', '获取未知问题失败');
    } finally {
      if (!cancelledRef.current && reqId === reqIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const loadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    const reqId = reqIdRef.current;
    loadQueries(reqId, page + 1).catch(() => {});
  };

  const handleStartResponding = (id: number) => {
    setRespondingId(id);
    setReplyText('');
  };

  const handleRespond = async (id: number) => {
    if (!replyText.trim()) {
      Alert.alert('提示', '请输入回答');
      return;
    }
    if (responding) return;
    setResponding(true);
    try {
      await unknownApi.respond(id, replyText.trim());
      Alert.alert('成功', '回答已保存，AI 下次会知道怎么回答了');
      setRespondingId(null);
      setReplyText('');
      loadQueries(reqIdRef.current, 1);
    } catch (err: any) {
      Alert.alert('错误', err.message || '保存失败，请稍后重试');
    } finally {
      setResponding(false);
    }
  };

  const renderQuery = ({ item }: { item: any }) => (
    <View style={styles.queryCard}>
      <View style={styles.queryInner}>
        <View style={styles.queryHeader}>
          <View style={styles.targetBadge}>
            <Text style={styles.targetName}>{item.target_name}</Text>
          </View>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString('zh-CN')}
          </Text>
        </View>
        <Text style={styles.question}>{item.question}</Text>

        {respondingId === item.id ? (
          <View style={styles.replyForm}>
            <TextInput
              style={styles.replyInput}
              placeholder="输入你的回答..."
              placeholderTextColor={colors.subtle}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.replyActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setRespondingId(null);
                  setReplyText('');
                }}
                activeOpacity={0.6}
              >
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.replyBtnWrapper, responding && styles.replyBtnDisabled]}
                onPress={() => handleRespond(item.id)}
                disabled={responding}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={gradients.primary as unknown as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.replyBtn}
                >
                  <Text style={styles.replyBtnText}>{responding ? '保存中...' : '回复并保存'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          !item.answered && (
            <TouchableOpacity
              style={styles.respondButton}
              onPress={() => handleStartResponding(item.id)}
              activeOpacity={0.6}
            >
              <Text style={styles.respondText}>回复</Text>
            </TouchableOpacity>
          )
        )}

        {item.answered && (
          <View style={styles.answeredBadge}>
            <Text style={styles.answeredDot}>✓</Text>
            <Text style={styles.answeredText}>已回复</Text>
          </View>
        )}
      </View>
    </View>
  );

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
        <NavBar title="未知问题" backTarget="/dashboard" />
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowAnswered(!showAnswered)}
            activeOpacity={0.6}
          >
            <Text style={styles.filterText}>
              {showAnswered ? '未回复' : '已回复'}
            </Text>
          </TouchableOpacity>
        </View>

        {queries.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>✅</Text>
            </View>
            <Text style={styles.emptyText}>
              {showAnswered ? '没有已回复的问题' : '没有未回复的问题'}
            </Text>
            <Text style={styles.emptyHint}>
              {showAnswered ? '回复问题后，会显示在这里' : '所有问题都已处理完毕'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={queries}
            renderItem={renderQuery}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.loadingMore} />
              ) : null
            }
          />
        )}
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
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMore: {
    paddingVertical: 16,
  },

  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 74,
    paddingBottom: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    color: colors.primary2,
    fontSize: 24,
    fontWeight: '400',
    marginTop: -2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.ink,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
    marginTop: 2,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.primaryTrack,
    borderWidth: 1,
    borderColor: 'rgba(20,109,114,0.18)',
  },
  filterText: {
    color: colors.primary2,
    fontSize: 13,
    fontWeight: '700',
  },

  list: {
    padding: 20,
    paddingBottom: 32,
  },
  queryCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  queryInner: {
    padding: 18,
  },
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetBadge: {
    backgroundColor: colors.primaryTrack,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(20,109,114,0.18)',
  },
  targetName: {
    fontSize: 13,
    color: colors.primary2,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
    color: colors.subtle,
  },
  question: {
    fontSize: 18,
    color: colors.ink,
    fontWeight: '900',
    marginBottom: 14,
    lineHeight: 26,
  },
  respondButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryTrack,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(20,109,114,0.12)',
  },
  respondText: {
    color: colors.primary2,
    fontSize: 14,
    fontWeight: '700',
  },
  replyForm: {
    marginTop: 4,
  },
  replyInput: {
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderRadius: radii.md,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.line,
    fontWeight: '700',
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cancelText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  replyBtnWrapper: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  replyBtnDisabled: {
    opacity: 0.6,
  },
  replyBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  replyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  answeredBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(31,122,90,0.18)',
  },
  answeredDot: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
  },
  answeredText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.line,
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
  },
});
