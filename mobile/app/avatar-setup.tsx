import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { avatarApi } from '@/lib/api';
import { colors, radii } from '@/lib/theme';

const RELATIONSHIP_OPTIONS = ['孙子', '孙女', '儿子', '女儿', '配偶', '朋友', '护理员', '其他'];

const PERSONALITY_TRAITS: { key: 'extroversion' | 'humor' | 'warmth' | 'patience' | 'curiosity'; label: string; minLabel: string; maxLabel: string }[] = [
  { key: 'extroversion', label: '外向程度', minLabel: '内向', maxLabel: '外向' },
  { key: 'humor', label: '幽默感', minLabel: '严肃', maxLabel: '幽默' },
  { key: 'warmth', label: '温暖程度', minLabel: '冷静', maxLabel: '温暖' },
  { key: 'patience', label: '耐心程度', minLabel: '一般', maxLabel: '极耐心' },
  { key: 'curiosity', label: '好奇心', minLabel: '低调', maxLabel: '好奇' },
];

type PersonalityTraits = {
  extroversion: number;
  humor: number;
  warmth: number;
  patience: number;
  curiosity: number;
};

type DialoguePrefs = {
  reply_length: 'short' | 'medium' | 'long';
  use_emoji: boolean;
  formality: 'casual' | 'normal' | 'formal';
  topic_depth: 'shallow' | 'normal' | 'deep';
};

function CustomSlider({ value, onValueChange, min = 0, max = 10 }: {
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const ref = useRef<View>(null);
  const [width, setWidth] = useState(0);

  const handleTouch = (locationX: number) => {
    if (width <= 0) return;
    const ratio = Math.max(0, Math.min(1, locationX / width));
    const newVal = Math.round(ratio * (max - min) + min);
    if (newVal !== value) onValueChange(newVal);
  };

  const pct = width > 0 ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <View
      ref={ref}
      style={sliderS.container}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => handleTouch(e.nativeEvent.locationX)}
      onResponderMove={(e) => handleTouch(e.nativeEvent.locationX)}
    >
      <View pointerEvents="none" style={sliderS.track}>
        <LinearGradient
          colors={['#146d72', '#6ba9a2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[sliderS.fill, { width: `${pct}%` }]}
        />
      </View>
      <View pointerEvents="none" style={[sliderS.thumb, { left: `${pct}%` }]} />
    </View>
  );
}

function SegmentedControl<T extends string>({ options, selected, onSelect }: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={segS.row}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[segS.btn, selected === opt.value && segS.btnActive]}
          onPress={() => onSelect(opt.value)}
          activeOpacity={0.7}
        >
          <Text style={[segS.label, selected === opt.value && segS.labelActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function AvatarSetupScreen() {
  const router = useRouter();
  const { avatarId } = useLocalSearchParams<{ avatarId?: string }>();
  const isEdit = !!avatarId;

  const [name, setName] = useState('');
  const [targetName, setTargetName] = useState('');
  const [persona, setPersona] = useState('');
  const [aiTone, setAiTone] = useState('语气亲切、温柔，像家人一样聊天');
  const [loading, setLoading] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [age, setAge] = useState(30);
  const [occupation, setOccupation] = useState('');
  const [relationship, setRelationship] = useState('');
  const [traits, setTraits] = useState<PersonalityTraits>({
    extroversion: 5, humor: 5, warmth: 5, patience: 5, curiosity: 5,
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [dialoguePrefs, setDialoguePrefs] = useState<DialoguePrefs>({
    reply_length: 'medium',
    use_emoji: true,
    formality: 'normal',
    topic_depth: 'normal',
  });

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (isEdit) {
      loadAvatar().catch(() => {});
    }
    return () => { cancelledRef.current = true; };
  }, []);

  const loadAvatar = async () => {
    try {
      const result = await avatarApi.getById(Number(avatarId));
      if (cancelledRef.current) return;
      const av = result.avatar;
      setName(av.name || '');
      setTargetName(av.target_name || '');
      setPersona(av.persona || '');
      setAiTone(av.ai_tone || '语气亲切、温柔，像家人一样聊天');

      const hasAdvanced = av.age || av.occupation || av.relationship ||
        av.personality_traits || (av.interests && av.interests.length > 0) ||
        av.dialogue_preferences;
      if (hasAdvanced) {
        setShowAdvanced(true);
        if (av.age != null) setAge(av.age);
        if (av.occupation) setOccupation(av.occupation);
        if (av.relationship) setRelationship(av.relationship);
        if (av.personality_traits) setTraits(prev => ({ ...prev, ...av.personality_traits }));
        if (av.interests && Array.isArray(av.interests)) setInterests(av.interests);
        if (av.dialogue_preferences) {
          setDialoguePrefs(prev => ({ ...prev, ...av.dialogue_preferences }));
        }
      }
    } catch (err: any) {
      Alert.alert('错误', err.message || '获取分身信息失败');
    }
  };

  const addInterest = () => {
    const tag = interestInput.trim();
    if (!tag) return;
    if (tag.length > 50) {
      Alert.alert('提示', '兴趣标签最多 50 个字符');
      return;
    }
    if (interests.includes(tag)) {
      Alert.alert('提示', '该兴趣已添加');
      return;
    }
    setInterests(prev => [...prev, tag]);
    setInterestInput('');
  };

  const removeInterest = (idx: number) => {
    setInterests(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请输入分身名称');
      return;
    }
    if (!targetName.trim()) {
      Alert.alert('提示', '请输入聊天对象的称呼');
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        name: name.trim(),
        target_name: targetName.trim(),
        persona: persona.trim(),
        ai_tone: aiTone.trim(),
      };

      if (showAdvanced) {
        data.age = age;
        data.occupation = occupation.trim() || null;
        data.relationship = relationship || null;
        data.personality_traits = traits;
        data.interests = interests.length > 0 ? interests : null;
        data.dialogue_preferences = dialoguePrefs;
      }

      if (isEdit) {
        await avatarApi.update(Number(avatarId), data);
        router.back();
      } else {
        const result = await avatarApi.create(data);
        router.replace({
          pathname: '/code-display',
          params: {
            avatarId: String(result.avatar.id),
            pairingCode: result.avatar.pairing_code,
            targetName: result.avatar.target_name,
            avatarName: result.avatar.name,
          },
        });
      }
    } catch (err: any) {
      Alert.alert('错误', err.message || (isEdit ? '更新失败' : '创建失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{isEdit ? '编辑分身' : '创建分身'}</Text>
        <Text style={styles.subtitle}>填写信息，AI 会根据这些信息来聊天</Text>

        <Text style={styles.label}>分身名称 *</Text>
        <TextInput
          style={styles.input}
          placeholder="如：小明、护理员小李"
          placeholderTextColor={colors.subtle}
          value={name}
          onChangeText={setName}
          autoFocus={!isEdit}
        />

        <Text style={styles.label}>聊天对象的称呼 *</Text>
        <TextInput
          style={styles.input}
          placeholder="如：爷爷、王奶奶"
          placeholderTextColor={colors.subtle}
          value={targetName}
          onChangeText={setTargetName}
        />

        <Text style={styles.label}>分身的人设描述</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="如：我是你的孙子小明，在深圳工作..."
          placeholderTextColor={colors.subtle}
          value={persona}
          onChangeText={setPersona}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>AI 语气风格</Text>
        <TextInput
          style={styles.input}
          placeholder="语气亲切、温柔，像家人一样聊天"
          placeholderTextColor={colors.subtle}
          value={aiTone}
          onChangeText={setAiTone}
        />

        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.advancedToggleText}>高级性格设置</Text>
          <Text style={styles.advancedToggleArrow}>{showAdvanced ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedPanel}>
            <Text style={styles.sectionTitle}>基础信息</Text>

            <Text style={styles.subLabel}>年龄：{age} 岁</Text>
            <CustomSlider value={age} onValueChange={setAge} min={1} max={100} />

            <Text style={styles.subLabel}>职业</Text>
            <TextInput
              style={styles.input}
              placeholder="如：教师、工程师、退休"
              placeholderTextColor={colors.subtle}
              value={occupation}
              onChangeText={setOccupation}
            />

            <Text style={styles.subLabel}>与聊天对象的关系</Text>
            <View style={styles.chipRow}>
              {RELATIONSHIP_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, relationship === opt && styles.chipActive]}
                  onPress={() => setRelationship(relationship === opt ? '' : opt)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, relationship === opt && styles.chipTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>性格特征</Text>
            {PERSONALITY_TRAITS.map(({ key, label, minLabel, maxLabel }) => (
              <View key={key} style={styles.traitRow}>
                <Text style={styles.traitLabel}>{label}</Text>
                <View style={styles.traitSliderArea}>
                  <Text style={styles.traitRangeLabel}>{minLabel}</Text>
                  <View style={styles.traitSliderWrap}>
                    <CustomSlider
                      value={traits[key]}
                      onValueChange={v => setTraits(prev => ({ ...prev, [key]: v }))}
                    />
                  </View>
                  <Text style={styles.traitRangeLabel}>{maxLabel}</Text>
                </View>
                <Text style={styles.traitValue}>{traits[key]}</Text>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>兴趣爱好</Text>
            <View style={styles.interestInputRow}>
              <TextInput
                style={[styles.input, styles.interestInput]}
                placeholder="输入兴趣，点击添加"
                placeholderTextColor={colors.subtle}
                value={interestInput}
                onChangeText={setInterestInput}
                onSubmitEditing={addInterest}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addTagBtn} onPress={addInterest} activeOpacity={0.7}>
                <LinearGradient
                  colors={[colors.primary, '#477e80']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addTagBtnGradient}
                >
                  <Text style={styles.addTagBtnText}>添加</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            {interests.length > 0 && (
              <View style={styles.tagRow}>
                {interests.map((tag, idx) => (
                  <View key={`${tag}-${idx}`} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <TouchableOpacity onPress={() => removeInterest(idx)} style={styles.tagRemove}>
                      <Text style={styles.tagRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>对话偏好</Text>

            <Text style={styles.prefLabel}>回复长度</Text>
            <SegmentedControl
              options={[
                { value: 'short' as const, label: '简短' },
                { value: 'medium' as const, label: '适中' },
                { value: 'long' as const, label: '详细' },
              ]}
              selected={dialoguePrefs.reply_length}
              onSelect={v => setDialoguePrefs(prev => ({ ...prev, reply_length: v }))}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>使用表情符号</Text>
              <Switch
                value={dialoguePrefs.use_emoji}
                onValueChange={v => setDialoguePrefs(prev => ({ ...prev, use_emoji: v }))}
                trackColor={{ true: 'rgba(20,109,114,0.35)', false: colors.lineDark }}
                thumbColor={dialoguePrefs.use_emoji ? colors.primary : '#f4f3f4'}
              />
            </View>

            <Text style={styles.prefLabel}>语气正式度</Text>
            <SegmentedControl
              options={[
                { value: 'casual' as const, label: '随意' },
                { value: 'normal' as const, label: '一般' },
                { value: 'formal' as const, label: '正式' },
              ]}
              selected={dialoguePrefs.formality}
              onSelect={v => setDialoguePrefs(prev => ({ ...prev, formality: v }))}
            />

            <Text style={styles.prefLabel}>话题深度</Text>
            <SegmentedControl
              options={[
                { value: 'shallow' as const, label: '轻松' },
                { value: 'normal' as const, label: '一般' },
                { value: 'deep' as const, label: '深入' },
              ]}
              selected={dialoguePrefs.topic_depth}
              onSelect={v => setDialoguePrefs(prev => ({ ...prev, topic_depth: v }))}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, '#477e80']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{isEdit ? '保存修改' : '生成配对码'}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const sliderS = StyleSheet.create({
  container: {
    height: 36,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryTrack,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    borderWidth: 2.5,
    borderColor: colors.primary,
    top: 7,
    marginLeft: -11,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
});

const segS = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    overflow: 'hidden',
    backgroundColor: colors.primaryTrack,
    marginTop: 4,
    padding: 3,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  btnActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '700',
  },
  labelActive: {
    color: '#fff',
    fontWeight: '900',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 24,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink2,
    marginBottom: 8,
    marginTop: 12,
  },
  subLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink2,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    fontSize: 18,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 100,
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.line,
  },
  advancedToggleText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  advancedToggleArrow: {
    fontSize: 14,
    color: colors.primary,
  },
  advancedPanel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.ink,
    marginTop: 4,
    marginBottom: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineDark,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.lineDark,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '900',
  },
  traitRow: {
    marginTop: 14,
  },
  traitLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink2,
    marginBottom: 6,
  },
  traitSliderArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  traitSliderWrap: {
    flex: 1,
  },
  traitRangeLabel: {
    fontSize: 12,
    color: colors.subtle,
    width: 42,
    textAlign: 'center',
    fontWeight: '600',
  },
  traitValue: {
    position: 'absolute',
    right: 0,
    top: 0,
    fontSize: 15,
    fontWeight: '900',
    color: colors.primary,
  },
  interestInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  interestInput: {
    flex: 1,
  },
  addTagBtn: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  addTagBtnGradient: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTrack,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tagText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  tagRemove: {
    marginLeft: 6,
    padding: 2,
  },
  tagRemoveText: {
    fontSize: 16,
    color: colors.subtle,
    fontWeight: '900',
  },
  prefLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink2,
    marginTop: 14,
    marginBottom: 4,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 4,
  },
  button: {
    borderRadius: radii.pill,
    overflow: 'hidden',
    marginTop: 28,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
});
