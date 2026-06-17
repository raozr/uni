import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, radii, shadows, gradients } from '@/lib/theme';

export default function CodeDisplayScreen() {
  const router = useRouter();
  const { pairingCode } = useLocalSearchParams<{
    avatarId: string;
    pairingCode: string;
    targetName: string;
    avatarName: string;
  }>();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Uni配对码：${pairingCode}\n\n下载 app 后输入这个配对码，就可以和 AI 聊天啦！`,
      });
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>🎉</Text>
        </View>
        <Text style={styles.title}>配对码已生成</Text>
        <Text style={styles.subtitle}>
          把下面的配对码分享给聊天对象，{'\n'}
          在 app 中输入后即可聊天
        </Text>

        <View style={styles.codeBox}>
          <Text style={styles.code}>{pairingCode}</Text>
        </View>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Text style={styles.shareButtonText}>📤 分享配对码</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.85} onPress={() => router.replace('/dashboard')}>
        <LinearGradient
          colors={gradients.primary as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.enterButton}
        >
          <Text style={styles.enterButtonText}>进入管理页面</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryTrack,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconEmoji: {
    fontSize: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    fontWeight: '600',
  },
  codeBox: {
    backgroundColor: colors.primaryTrack,
    borderRadius: radii.lg,
    paddingVertical: 24,
    paddingHorizontal: 36,
    marginBottom: 24,
  },
  code: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.primary2,
    letterSpacing: 8,
  },
  shareButton: {
    backgroundColor: colors.coralBg,
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  shareButtonText: {
    fontSize: 18,
    color: colors.coral2,
    fontWeight: '900',
  },
  enterButton: {
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    overflow: 'hidden',
  },
  enterButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
});
