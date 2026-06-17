import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '@/lib/theme';

interface NavBarProps {
  title: string;
  backTarget?: string;
  rightText?: string;
  onExit?: () => void;
}

export default function NavBar({ title, backTarget, rightText, onExit }: NavBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (backTarget) {
      router.push(backTarget);
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.wrapper, { top: insets.top + 8 }]}>
      <View style={styles.pill}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.6}>
          <Text style={styles.backText}>‹ 返回</Text>
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {onExit ? (
          <TouchableOpacity style={styles.exitBtn} onPress={onExit} activeOpacity={0.6}>
            <Text style={styles.exitIcon}>↪</Text>
          </TouchableOpacity>
        ) : rightText ? (
          <View style={styles.rightTextWrapper}>
            <Text style={styles.rightTextLabel}>{rightText}</Text>
          </View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
  },
  pill: {
    height: 54,
    marginHorizontal: 12,
    borderRadius: 22,
    backgroundColor: colors.white48,
    borderWidth: 1,
    borderColor: colors.white58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  backBtn: {
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.42)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    color: colors.primary2,
    fontWeight: '900',
    fontSize: 15,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: colors.ink,
  },
  exitBtn: {
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderRadius: radii.pill,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitIcon: {
    fontSize: 20,
    color: colors.ink,
  },
  rightTextWrapper: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rightTextLabel: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  placeholder: {
    width: 60,
  },
});
