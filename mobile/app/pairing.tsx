import { useState, Fragment } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { pairingApi } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, gradients } from '@/lib/theme';

export default function PairingScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNumberPress = (num: string) => {
    if (code.length < 6) {
      setCode(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setCode(prev => prev.slice(0, -1));
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('提示', '请输入完整的6位数字');
      return;
    }

    setLoading(true);
    try {
      const result = await pairingApi.verifyCode(code);
      await AsyncStorage.multiSet([
        ['paired_avatar', JSON.stringify({
          avatarId: result.avatar_id,
          avatarName: result.avatar_name,
          targetName: result.target_name,
        })],
        ['pairing_token', result.pairing_token],
        ['last_identity', 'chat'],
      ]);

      router.replace({
        pathname: '/chat/[avatarId]',
        params: {
          avatarId: String(result.avatar_id),
          avatarName: result.avatar_name,
          targetName: result.target_name,
        },
      });
    } catch (err: any) {
      Alert.alert('配对失败', err.message || '配对码无效，请检查后重新输入');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const codeDigits = Array.from({ length: 6 }, (_, i) => code[i] || '');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>输入配对码</Text>
          <Text style={styles.subtitle}>请输入分享给你的配对码</Text>
        </View>

        <View style={styles.codeRow}>
          {codeDigits.map((digit, i) => (
            <Fragment key={i}>
              {i === 3 && <View style={styles.codeSeparator} />}
              <View style={[styles.codeSlot, digit ? styles.codeSlotActive : undefined]}>
                <Text style={[styles.codeSlotText, digit ? styles.codeSlotTextActive : undefined]}>
                  {digit}
                </Text>
              </View>
            </Fragment>
          ))}
        </View>

        <View style={styles.keypadContainer}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, index) => {
            if (key === '') {
              return <View key={index} style={styles.keySpacer} />;
            }
            if (key === 'del') {
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.keyButton}
                  onPress={handleDelete}
                  activeOpacity={0.5}
                >
                  <Text style={styles.keyDelText}>⌫</Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={index}
                style={styles.keyButton}
                onPress={() => handleNumberPress(key)}
                activeOpacity={0.5}
              >
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {code.length === 6 && (
          <TouchableOpacity
            style={[styles.verifyWrapper, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={gradients.primary as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.verifyGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyText}>开始聊天</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: colors.muted,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  codeSlot: {
    width: 44,
    height: 56,
    borderRadius: 13,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.lineDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeSlotActive: {
    backgroundColor: colors.primaryTrack,
    borderColor: colors.primary,
  },
  codeSlotText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.lineDark,
  },
  codeSlotTextActive: {
    color: colors.primary2,
  },
  codeSeparator: {
    width: 14,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(23,38,45,0.38)',
    alignSelf: 'center',
  },
  keypadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 280,
    gap: 10,
  },
  keyButton: {
    width: 80,
    height: 64,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 28,
    color: colors.ink,
    fontWeight: '900',
  },
  keyDelText: {
    fontSize: 26,
    color: colors.muted,
    fontWeight: '700',
  },
  keySpacer: {
    width: 80,
    height: 64,
  },
  verifyWrapper: {
    marginTop: 28,
    borderRadius: radii.pill,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  verifyGradient: {
    paddingVertical: 16,
    paddingHorizontal: 60,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  verifyText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
});
