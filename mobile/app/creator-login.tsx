import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { authApi, setAuthToken, avatarApi } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavBar from '@/lib/components/NavBar';
import { colors, gradients, radii } from '@/lib/theme';

export default function CreatorLoginScreen() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || (isRegister && !name)) {
      Alert.alert('提示', '请填写完整信息');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isRegister) {
        result = await authApi.register(email, password, name);
      } else {
        result = await authApi.login(email, password);
      }

      setAuthToken(result.token);
      await AsyncStorage.multiSet([
        ['auth_token', result.token],
        ['user', JSON.stringify(result.user)],
        ['last_identity', 'creator'],
      ]);

      const avatarsRes = await avatarApi.getAll();

      if (avatarsRes.avatars.length > 0) {
        router.replace('/dashboard');
      } else {
        router.replace('/avatar-setup');
      }
    } catch (err: any) {
      Alert.alert('错误', err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <NavBar title="登录" backTarget="/" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <BlurView intensity={24} tint="light" style={styles.glassCard}>
          <View style={styles.glassBorder}>
            <Text style={styles.title}>{isRegister ? '创建账号' : '登录'}</Text>

            {isRegister && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>称呼</Text>
                <TextInput
                  style={styles.input}
                  placeholder="你的称呼"
                  placeholderTextColor={colors.subtle}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>邮箱</Text>
              <TextInput
                style={styles.input}
                placeholder="输入邮箱地址"
                placeholderTextColor={colors.subtle}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus={!isRegister}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>密码</Text>
              <TextInput
                style={styles.input}
                placeholder="密码（至少6位）"
                placeholderTextColor={colors.subtle}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityLabel={isRegister ? '注册' : '登录'}
            >
              <LinearGradient
                colors={gradients.primary as unknown as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{isRegister ? '注册' : '登录'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsRegister(!isRegister)}
              activeOpacity={0.7}
              accessibilityLabel={isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            >
              <Text style={styles.switchText}>
                {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  glassCard: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  glassBorder: {
    padding: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 22,
  },
  inputWrapper: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.ink2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    fontWeight: '700',
  },
  button: {
    marginTop: 8,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  buttonText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '900',
  },
  switchButton: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: {
    color: colors.primary2,
    fontSize: 16,
    fontWeight: '900',
  },
});
