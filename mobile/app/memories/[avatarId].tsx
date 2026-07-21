import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { memoryApi } from '@/lib/api';
import NavBar from '@/lib/components/NavBar';
import { colors, gradients, radii } from '@/lib/theme';

type Memory = {
  id: number;
  avatar_id: number;
  key: string;
  content: string;
  source: 'manual' | 'auto';
  created_at: string;
  updated_at: string;
};

export default function MemoriesScreen() {
  const { avatarId } = useLocalSearchParams<{ avatarId: string }>();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState<{ visible: boolean; memory: Memory | null }>({
    visible: false,
    memory: null,
  });
  const [editKey, setEditKey] = useState('');
  const [editContent, setEditContent] = useState('');

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    loadMemories().catch(() => {});
    return () => { cancelledRef.current = true; };
  }, []);

  const loadMemories = async () => {
    try {
      const result = await memoryApi.getList(Number(avatarId));
      if (cancelledRef.current) return;
      setMemories(result.memories);
    } catch {
      if (!cancelledRef.current) Alert.alert('错误', '获取记忆列表失败');
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newKey.trim()) {
      Alert.alert('提示', '请输入记忆标题');
      return;
    }
    if (!newContent.trim()) {
      Alert.alert('提示', '请输入记忆内容');
      return;
    }

    setSaving(true);
    try {
      await memoryApi.create(Number(avatarId), {
        key: newKey.trim(),
        content: newContent.trim(),
      });
      setShowAddForm(false);
      setNewKey('');
      setNewContent('');
      loadMemories();
    } catch (err: any) {
      Alert.alert('错误', err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (memory: Memory) => {
    Alert.alert('确认删除', `确定要删除记忆「${memory.key}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await memoryApi.delete(Number(avatarId), memory.id);
            setMemories(prev => prev.filter(m => m.id !== memory.id));
          } catch (err: any) {
            Alert.alert('错误', err.message || '删除失败');
          }
        },
      },
    ]);
  };

  const openEdit = (memory: Memory) => {
    setEditKey(memory.key);
    setEditContent(memory.content);
    setEditModal({ visible: true, memory });
  };

  const handleEdit = async () => {
    if (!editModal.memory) return;
    if (!editKey.trim() || !editContent.trim()) {
      Alert.alert('提示', '标题和内容不能为空');
      return;
    }

    setSaving(true);
    try {
      await memoryApi.update(Number(avatarId), editModal.memory.id, {
        key: editKey.trim(),
        content: editContent.trim(),
      });
      setEditModal({ visible: false, memory: null });
      loadMemories();
    } catch (err: any) {
      Alert.alert('错误', err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const displayMemories = useMemo(() => {
    if (!searchQuery.trim()) return memories;
    const q = searchQuery.toLowerCase();
    return memories.filter(
      m => m.key.toLowerCase().includes(q) || m.content.toLowerCase().includes(q)
    );
  }, [memories, searchQuery]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const renderMemory = ({ item }: { item: Memory }) => (
    <View style={styles.memoryCard}>
      <View style={styles.memoryInner}>
        <View style={styles.memoryHeader}>
          <View style={styles.memoryTitleRow}>
            <Text style={styles.memoryKey} numberOfLines={1}>{item.key}</Text>
            <View style={[styles.sourceBadge, item.source === 'auto' ? styles.sourceAuto : styles.sourceManual]}>
              <Text style={[styles.sourceBadgeText, item.source === 'auto' ? styles.sourceAutoText : styles.sourceManualText]}>
                {item.source === 'auto' ? '自动' : '手动'}
              </Text>
            </View>
          </View>
          <Text style={styles.memoryDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={styles.memoryContent} numberOfLines={3}>{item.content}</Text>
        <View style={styles.memoryActions}>
          <TouchableOpacity style={styles.memoryActionBtn} onPress={() => openEdit(item)} activeOpacity={0.6}>
            <Text style={styles.memoryActionText}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.memoryActionBtn} onPress={() => handleDelete(item)} activeOpacity={0.6}>
            <Text style={styles.deleteActionText}>删除</Text>
          </TouchableOpacity>
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
        <NavBar title="记忆管理" backTarget="/dashboard" />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="搜索记忆..."
              placeholderTextColor={colors.subtle}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>

          <TouchableOpacity
            style={styles.addButtonWrapper}
            onPress={() => setShowAddForm(!showAddForm)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={gradients.primary as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>
                {showAddForm ? '取消' : '+ 添加记忆'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {showAddForm && (
            <View style={styles.formCard}>
              <View style={styles.formInner}>
                <TextInput
                  style={styles.input}
                  placeholder="记忆标题（如：喜欢的食物）"
                  placeholderTextColor={colors.subtle}
                  value={newKey}
                  onChangeText={setNewKey}
                  maxLength={100}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="记忆内容（如：喜欢吃红烧肉，不喜欢吃辣的）"
                  placeholderTextColor={colors.subtle}
                  value={newContent}
                  onChangeText={setNewContent}
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.saveButtonWrapper, saving && styles.buttonDisabled]}
                  onPress={handleAdd}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={gradients.primary as unknown as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButton}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveText}>保存</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {displayMemories.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>🧠</Text>
              </View>
              <Text style={styles.emptyText}>
                {searchQuery ? '没有匹配的记忆' : '还没有记忆'}
              </Text>
              <Text style={styles.emptyHint}>
                {searchQuery ? '试试其他关键词' : '添加记忆后，AI 聊天时会自然地引用这些内容'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={displayMemories}
              renderItem={renderMemory}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={editModal.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModal({ visible: false, memory: null })}
      >
        <View style={styles.modalWrapper}>
          <LinearGradient
            colors={[...gradients.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.3, y: 1 }}
            style={styles.bgGradient}
          />
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModal({ visible: false, memory: null })}>
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>编辑记忆</Text>
              <TouchableOpacity onPress={handleEdit} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.modalSaveText}>保存</Text>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.label}>记忆标题</Text>
              <TextInput
                style={styles.input}
                value={editKey}
                onChangeText={setEditKey}
                maxLength={100}
                placeholderTextColor={colors.subtle}
              />
              <Text style={styles.label}>记忆内容</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editContent}
                onChangeText={setEditContent}
                multiline
                textAlignVertical="top"
                placeholderTextColor={colors.subtle}
              />
              {editModal.memory && (
                <Text style={styles.sourceInfo}>
                  来源：{editModal.memory.source === 'auto' ? '自动提取' : '手动录入'}
                  {editModal.memory.updated_at !== editModal.memory.created_at &&
                    ` · 更新于 ${formatDate(editModal.memory.updated_at)}`}
                </Text>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  bgGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
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

  searchBar: {
    paddingHorizontal: 20,
    paddingTop: 74,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    fontWeight: '700',
  },

  addButtonWrapper: {
    marginHorizontal: 20,
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
    minHeight: 100,
  },
  saveButtonWrapper: {
    borderRadius: radii.pill,
    overflow: 'hidden',
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
  buttonDisabled: {
    opacity: 0.6,
  },

  list: {
    padding: 20,
    paddingBottom: 32,
  },
  memoryCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  memoryInner: {
    padding: 18,
  },
  memoryHeader: {
    marginBottom: 10,
  },
  memoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  memoryKey: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.ink,
    flex: 1,
    marginRight: 8,
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sourceManual: {
    backgroundColor: colors.primaryTrack,
    borderWidth: 1,
    borderColor: 'rgba(20,109,114,0.18)',
  },
  sourceAuto: {
    backgroundColor: colors.coralBg,
    borderWidth: 1,
    borderColor: 'rgba(215,123,85,0.18)',
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sourceManualText: {
    color: colors.primary2,
  },
  sourceAutoText: {
    color: colors.coral2,
  },
  memoryDate: {
    fontSize: 12,
    color: colors.subtle,
  },
  memoryContent: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    marginBottom: 12,
  },
  memoryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  memoryActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primaryTrack,
    borderWidth: 1,
    borderColor: 'rgba(20,109,114,0.12)',
  },
  memoryActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary2,
  },
  deleteActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
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

  modalWrapper: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalCancelText: {
    fontSize: 16,
    color: colors.muted,
    fontWeight: '800',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.ink,
  },
  modalSaveText: {
    fontSize: 16,
    color: colors.primary2,
    fontWeight: '900',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.ink2,
    marginBottom: 8,
    marginTop: 14,
  },
  sourceInfo: {
    fontSize: 13,
    color: colors.subtle,
    marginTop: 14,
  },
});
