import { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { avatarApi } from '@/lib/api';
import NavBar from '@/lib/components/NavBar';
import { colors, gradients, radii } from '@/lib/theme';

export default function PresetAnswersScreen() {
  const { avatarId } = useLocalSearchParams<{ avatarId: string }>();
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    loadAnswers().catch(() => {});
    return () => { cancelledRef.current = true; };
  }, []);

  const loadAnswers = async () => {
    try {
      const result = await avatarApi.getPresetAnswers(Number(avatarId));
      if (cancelledRef.current) return;
      setAnswers(result.preset_answers);
    } catch {
      if (!cancelledRef.current) Alert.alert('错误', '获取预设问答失败');
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!keywords.trim() || !question.trim() || !answer.trim()) {
      Alert.alert('提示', '请填写完整信息');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await avatarApi.addPresetAnswer(Number(avatarId), {
        keywords: keywords.trim(),
        question: question.trim(),
        answer: answer.trim(),
      });
      setShowForm(false);
      setKeywords('');
      setQuestion('');
      setAnswer('');
      loadAnswers();
    } catch (err: any) {
      Alert.alert('错误', err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('确认删除', '确定要删除这个预设问答吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await avatarApi.deletePresetAnswer(Number(avatarId), id);
            loadAnswers();
          } catch (err: any) {
            Alert.alert('错误', err.message || '删除失败');
          }
        },
      },
    ]);
  };

  const renderAnswer = ({ item }: { item: any }) => (
    <View style={styles.answerCard}>
      <View style={styles.answerInner}>
        <View style={styles.answerHeader}>
          <View style={styles.questionBadge}>
            <Text style={styles.questionBadgeText}>Q</Text>
          </View>
          <Text style={styles.questionText} numberOfLines={2}>{item.question}</Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id)}
            activeOpacity={0.6}
            accessibilityLabel={`删除预设问答「${item.question}」`}
          >
            <Text style={styles.deleteText}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.answerBody}>
          <View style={styles.answerBadge}>
            <Text style={styles.answerBadgeText}>A</Text>
          </View>
          <Text style={styles.answerText}>{item.answer}</Text>
        </View>
        <View style={styles.keywordsRow}>
          {(item.keywords || '').split(',').map((kw: string, idx: number) => (
            <View key={idx} style={styles.keywordChip}>
              <Text style={styles.keywordText}>{kw.trim()}</Text>
            </View>
          ))}
        </View>
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
        <NavBar title="预设问答" backTarget="/dashboard" />

        <TouchableOpacity
          style={styles.addButtonWrapper}
          onPress={() => setShowForm(!showForm)}
          activeOpacity={0.8}
          accessibilityLabel={showForm ? '取消添加预设问答' : '添加预设问答'}
        >
          <LinearGradient
            colors={gradients.primary as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>
              {showForm ? '取消' : '+ 添加预设问答'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {showForm && (
          <View style={styles.formCard}>
            <View style={styles.formInner}>
              <TextInput
                style={styles.input}
                placeholder="关键词（用逗号分隔，如：天气,下雨,带伞）"
                placeholderTextColor={colors.subtle}
                value={keywords}
                onChangeText={setKeywords}
              />
              <Text style={styles.inputHint}>多个关键词用英文逗号分隔，匹配到任意关键词即触发回答</Text>
              <TextInput
                style={styles.input}
                placeholder="常见问题"
                placeholderTextColor={colors.subtle}
                value={question}
                onChangeText={setQuestion}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="预设回答"
                placeholderTextColor={colors.subtle}
                value={answer}
                onChangeText={setAnswer}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.saveButtonWrapper, saving && styles.saveButtonDisabled]}
                onPress={handleAdd}
                disabled={saving}
                activeOpacity={0.8}
                accessibilityLabel="保存预设问答"
              >
                <LinearGradient
                  colors={gradients.primary as unknown as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButton}
                >
                  <Text style={styles.saveText}>{saving ? '保存中...' : '保存'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {answers.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>📝</Text>
            </View>
            <Text style={styles.emptyText}>还没有预设问答</Text>
            <Text style={styles.emptyHint}>
              添加常见问题的回答，AI 会优先使用预设回答
            </Text>
          </View>
        ) : (
          <FlatList
            data={answers}
            renderItem={renderAnswer}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
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
  headerSpacer: {
    width: 36,
  },

  addButtonWrapper: {
    marginHorizontal: 20,
    marginTop: 74,
    marginBottom: 12,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#146d72',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  addButton: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  formCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  formInner: {
    padding: 18,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderRadius: radii.md,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 80,
  },
  inputHint: {
    fontSize: 12,
    color: colors.subtle,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  saveButtonWrapper: {
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  list: {
    padding: 20,
    paddingBottom: 32,
  },
  answerCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  answerInner: {
    padding: 18,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  questionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryTrack,
    borderWidth: 1,
    borderColor: 'rgba(20,109,114,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  questionBadgeText: {
    color: colors.primary2,
    fontSize: 14,
    fontWeight: '800',
  },
  questionText: {
    flex: 1,
    fontSize: 17,
    color: colors.ink,
    fontWeight: '900',
    lineHeight: 24,
    paddingTop: 2,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(197,68,44,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteText: {
    fontSize: 20,
    color: colors.danger,
    fontWeight: '600',
    marginTop: -2,
  },
  answerBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  answerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.coralBg,
    borderWidth: 1,
    borderColor: 'rgba(215,123,85,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  answerBadgeText: {
    color: '#d77b55',
    fontSize: 14,
    fontWeight: '800',
  },
  answerText: {
    flex: 1,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keywordChip: {
    backgroundColor: colors.primaryTrack,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(20,109,114,0.12)',
  },
  keywordText: {
    fontSize: 12,
    color: colors.primary2,
    fontWeight: '600',
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
