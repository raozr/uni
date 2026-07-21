import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { chatApi } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, gradients } from '@/lib/theme';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { avatarId, avatarName, targetName, conversationId, isCreator } = useLocalSearchParams<{
    avatarId: string;
    avatarName?: string;
    targetName?: string;
    conversationId?: string;
    isCreator?: string;
  }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const msgIdCounter = useRef(0);
  const nextMsgId = () => `local-${++msgIdCounter.current}`;

  const isCreatorMode = isCreator === 'true';
  const activeConversationId = conversationId ? Number(conversationId) : undefined;
  const aiLabel = avatarName || targetName || 'AI';
  const chatTitle = isCreatorMode
    ? `同「${targetName}」聊天`
    : `同「${aiLabel}」聊天`;

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    loadHistory().catch(() => {});
    if (!isCreatorMode) {
      AsyncStorage.setItem('last_identity', 'chat');
    }
    return () => { cancelledRef.current = true; };
  }, []);

  const handleExitChat = () => {
    Alert.alert('退出聊天', '退出后将清除配对信息，下次需重新输入配对码', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['paired_avatar', 'pairing_token', 'last_identity']);
          router.replace('/');
        },
      },
    ]);
  };

  const loadHistory = async () => {
    try {
      const result = await chatApi.getHistory(Number(avatarId), 50, activeConversationId);
      if (cancelledRef.current) return;
      const formatted: Message[] = result.messages.map((m: any, i: number) => ({
        id: `msg-${i}`,
        role: (m.role === 'creator' || m.role === 'ai') ? 'ai' : 'user',
        content: m.content,
      }));
      setMessages(formatted);
    } catch (err) {
      console.warn('loadHistory failed:', err);
    }
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || loading) return;

    setInputText('');
    const role = isCreatorMode ? 'ai' : 'user';
    const userMsg: Message = {
      id: nextMsgId(),
      role,
      content: text,
    };
    setMessages(prev => [...prev, userMsg]);

    setLoading(true);
    try {
      if (isCreatorMode) {
        await chatApi.sendCreatorReply(Number(avatarId), text, activeConversationId);
      } else {
        const result = await chatApi.sendMessage(Number(avatarId), text, activeConversationId);
        const aiMsg: Message = {
          id: nextMsgId(),
          role: 'ai',
          content: result.reply,
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: nextMsgId(),
        role: 'ai',
        content: err?.message || '发送失败，请稍后重试',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    let label = '';
    if (isUser) {
      label = isCreatorMode ? (targetName || '你') : '你';
    } else {
      label = aiLabel;
    }

    return (
      <View style={[styles.messageRow, isUser && styles.userRow]}>
        {isUser ? (
          <View style={styles.userBubbleWrapper}>
            <LinearGradient
              colors={gradients.bubble as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.userBubbleGradient}
            >
              <Text style={styles.userMessageText}>{item.content}</Text>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.aiBubbleWrapper}>
            <Text style={styles.roleLabel}>{label}</Text>
            <Text style={styles.aiMessageText}>{item.content}</Text>
          </View>
        )}
      </View>
    );
  }, [isCreatorMode, targetName, aiLabel]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `${chatTitle}`,
          headerRight: !isCreatorMode
            ? () => <ExitButton onPress={handleExitChat} />
            : undefined,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        <View style={styles.chatArea}>
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Text style={styles.emptyIcon}>💬</Text>
              </View>
              <Text style={styles.emptyText}>
                {isCreatorMode ? `同「${targetName}」的聊天记录` : `开始和${aiLabel}聊天吧！`}
              </Text>
              <Text style={styles.emptyHint}>
                {isCreatorMode ? `在这里可以以${aiLabel}的身份回复` : `你可以问任何问题，${aiLabel}会尽力回答`}
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              contentContainerStyle={styles.messageList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            />
          )}
        </View>

        <BlurView intensity={30} tint="light" style={styles.inputAreaBlur}>
          <View style={styles.inputArea}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="输入消息..."
                placeholderTextColor={colors.subtle}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
            </View>
            <TouchableOpacity
              style={[styles.sendWrapper, (!inputText.trim() || loading) && styles.sendDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={gradients.primary as unknown as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendText}>发送</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </>
  );
}

function ExitButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.exitButtonCircle}
    >
      <Text style={styles.exitIcon}>↪</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    gap: 12,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 74,
    height: 74,
    borderRadius: 28,
    backgroundColor: colors.surfaceSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
  },

  messageRow: {
    alignItems: 'flex-start',
  },
  userRow: {
    alignItems: 'flex-end',
  },

  userBubbleWrapper: {
    maxWidth: '82%',
    borderRadius: 24,
    borderBottomRightRadius: 9,
    overflow: 'hidden',
  },
  userBubbleGradient: {
    padding: 13,
    paddingHorizontal: 15,
  },
  userMessageText: {
    fontSize: 17,
    lineHeight: 25,
    color: '#fff',
    fontWeight: '500',
  },

  aiBubbleWrapper: {
    maxWidth: '82%',
    padding: 13,
    paddingHorizontal: 15,
    borderRadius: 24,
    borderBottomLeftRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.66)',
  },
  roleLabel: {
    fontSize: 12,
    color: colors.subtle,
    marginBottom: 4,
    fontWeight: '900',
  },
  aiMessageText: {
    fontSize: 17,
    lineHeight: 25,
    color: colors.ink,
  },

  inputAreaBlur: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.56)',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.64)',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    color: colors.ink,
  },
  sendWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  sendGradient: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  exitButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitIcon: {
    fontSize: 22,
    color: '#0f555d',
    lineHeight: 22,
  },
});
