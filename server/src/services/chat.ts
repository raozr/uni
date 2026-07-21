import { query } from '../db';
import { askDeepSeek } from './deepseek';
import { sendPushNotification } from './push';

interface PresetAnswer {
  keywords: string;
  answer: string;
}

export function matchPresetAnswer(content: string, presets: PresetAnswer[]): string | null {
  const lowerContent = content.toLowerCase();

  for (const preset of presets) {
    const keywords = preset.keywords.split(',').map((k: string) => k.trim().toLowerCase());
    const matchCount = keywords.filter((k: string) => lowerContent.includes(k)).length;
    if (keywords.length > 0 && matchCount >= Math.ceil(keywords.length / 2)) {
      return preset.answer;
    }
  }

  return null;
}

async function getAvatarMemories(avatarId: number): Promise<Array<{ key: string; content: string }>> {
  const result = await query(
    'SELECT key, content FROM avatar_memories WHERE avatar_id = $1 ORDER BY created_at DESC LIMIT 20',
    [avatarId]
  );
  return result.rows;
}

interface PersonalityTraits {
  extroversion?: number;
  humor?: number;
  warmth?: number;
  patience?: number;
  curiosity?: number;
}

interface DialoguePreferences {
  reply_length?: 'short' | 'medium' | 'long';
  use_emoji?: boolean;
  formality?: 'casual' | 'normal' | 'formal';
  topic_depth?: 'shallow' | 'normal' | 'deep';
}

interface AvatarForPrompt {
  id: number;
  name: string;
  target_name: string;
  persona: string;
  ai_tone: string;
  age?: number | null;
  occupation?: string | null;
  relationship?: string | null;
  personality_traits?: PersonalityTraits | null;
  interests?: string[] | null;
  dialogue_preferences?: DialoguePreferences | null;
}

function describeTraitLevel(value: number): string {
  if (value <= 2) return '很低';
  if (value <= 4) return '偏低';
  if (value <= 6) return '适中';
  if (value <= 8) return '偏高';
  return '很高';
}

function buildTraitsDescription(traits: PersonalityTraits): string {
  const parts: string[] = [];
  const traitLabels: Record<string, string> = {
    extroversion: '外向程度',
    humor: '幽默感',
    warmth: '温暖度',
    patience: '耐心',
    curiosity: '好奇心',
  };
  for (const [key, label] of Object.entries(traitLabels)) {
    const val = traits[key as keyof PersonalityTraits];
    if (val !== undefined) {
      parts.push(`${label}${describeTraitLevel(val)}(${val}/10)`);
    }
  }
  return parts.join('、');
}

function buildDialogueInstructions(prefs: DialoguePreferences): string {
  const instructions: string[] = [];

  if (prefs.reply_length) {
    const map: Record<string, string> = {
      short: '回复要简短精炼，每次1-2句话',
      medium: '回复长度适中，3-5句话',
      long: '回复可以详细一些，充分展开话题',
    };
    instructions.push(map[prefs.reply_length]);
  }

  if (prefs.use_emoji !== undefined) {
    instructions.push(prefs.use_emoji ? '可以适当使用表情符号增加亲切感' : '不要使用表情符号');
  }

  if (prefs.formality) {
    const map: Record<string, string> = {
      casual: '语气随意轻松，像朋友聊天一样',
      normal: '语气自然平和',
      formal: '语气稍微正式一些，但不失亲切',
    };
    instructions.push(map[prefs.formality]);
  }

  if (prefs.topic_depth) {
    const map: Record<string, string> = {
      shallow: '话题以轻松闲聊为主，不要深入复杂话题',
      normal: '可以适度讨论各种话题',
      deep: '可以深入探讨话题，引导对方分享更多想法和感受',
    };
    instructions.push(map[prefs.topic_depth]);
  }

  return instructions.join('；');
}

async function buildSystemPrompt(avatar: AvatarForPrompt): Promise<string> {
  const memories = await getAvatarMemories(avatar.id);

  let prompt = `你是${avatar.name}，一个AI陪聊分身。`;

  prompt += `\n\n你的角色设定：`;
  if (avatar.persona) {
    prompt += `\n${avatar.persona}`;
  }
  if (avatar.age) {
    prompt += `\n年龄：${avatar.age}岁`;
  }
  if (avatar.occupation) {
    prompt += `\n职业：${avatar.occupation}`;
  }

  prompt += `\n\n你与聊天对象的关系：`;
  if (avatar.relationship) {
    prompt += `你是${avatar.target_name}的${avatar.relationship}`;
  } else {
    prompt += `你是${avatar.target_name}的${avatar.name}`;
  }

  prompt += `\n\n你的性格与风格：`;
  prompt += `\n- 语气风格：${avatar.ai_tone}`;
  if (avatar.personality_traits) {
    const traitsDesc = buildTraitsDescription(avatar.personality_traits);
    if (traitsDesc) {
      prompt += `\n- 性格特质：${traitsDesc}`;
    }
  }
  if (avatar.interests && avatar.interests.length > 0) {
    prompt += `\n- 兴趣爱好：${avatar.interests.join('、')}`;
  }

  if (avatar.dialogue_preferences) {
    const dialogueInstr = buildDialogueInstructions(avatar.dialogue_preferences);
    if (dialogueInstr) {
      prompt += `\n\n对话风格指引：\n${dialogueInstr}`;
    }
  }

  prompt += `\n\n对话规则：
1. 始终保持角色一致性
2. 用亲切、自然的语气交流
3. 记住你是在陪${avatar.target_name}聊天，要关心对方
4. 如果对方提到身体不适或紧急情况，要表达关心并建议寻求专业帮助
5. 回复要符合你的性格设定，不要突然变得过于正式或生硬`;

  if (memories.length > 0) {
    prompt += `\n\n你对${avatar.target_name}的了解：\n`;
    memories.forEach(memory => {
      prompt += `- ${memory.key}：${memory.content}\n`;
    });
    prompt += `\n在对话中，当话题相关时，可以自然地引用这些了解，让对话更亲切和个性化。但不要生硬地提及，要自然融入对话中。`;
  }

  return prompt;
}

async function getRecentHistory(
  avatarId: number,
  conversationId?: number | null,
  excludeLatestUserMessage = false
): Promise<{ role: string; content: string }[]> {
  const where = conversationId
    ? 'avatar_id = $1 AND conversation_id = $2'
    : 'avatar_id = $1';
  const params = conversationId ? [avatarId, conversationId] : [avatarId];
  const result = await query(
    `SELECT role, content FROM chat_messages
     WHERE ${where}
     ORDER BY created_at DESC LIMIT 10`,
    params
  );
  let rows = result.rows.reverse();
  if (excludeLatestUserMessage) {
    const lastIdx = rows.length - 1;
    if (lastIdx >= 0 && rows[lastIdx].role === 'user') {
      rows = rows.slice(0, lastIdx);
    }
  }
  return rows;
}

export async function handleChatMessage(
  avatarId: number,
  content: string,
  deviceToken?: string,
  conversationId?: number | null
): Promise<string> {
  const presetResult = await query(
    'SELECT keywords, answer FROM preset_answers WHERE avatar_id = $1',
    [avatarId]
  );

  const presetMatch = matchPresetAnswer(content, presetResult.rows);
  if (presetMatch) {
    return presetMatch;
  }

  const avatarResult = await query(
    'SELECT * FROM avatars WHERE id = $1',
    [avatarId]
  );

  if (avatarResult.rows.length === 0) {
    throw new Error('Avatar not found');
  }

  const avatar = avatarResult.rows[0];

  const systemPrompt = await buildSystemPrompt(avatar);
  const history = await getRecentHistory(avatarId, conversationId, false);

  try {
    const reply = await askDeepSeek(systemPrompt, history, content);

    if (isUncertainReply(reply)) {
      await query(
        `INSERT INTO unknown_queries (avatar_id, question)
         SELECT $1, $2 WHERE NOT EXISTS (
           SELECT 1 FROM unknown_queries
           WHERE avatar_id = $1 AND question = $2 AND answered = FALSE
         )`,
        [avatarId, content]
      );

      await sendPushNotification({
        to: deviceToken,
        avatarId,
        title: 'Uni 有一个待补充问题',
        body: content.slice(0, 80),
      }).catch((pushErr) => console.warn('Push notification failed:', pushErr));

      return `这个问题我不太确定，我记下来了，稍后再聊好吗？`;
    }

    return reply;
  } catch (err) {
    console.error('DeepSeek API error:', err);

    return '我这边遇到了一点小问题，请稍后再试一次。';
  }
}

export function isUncertainReply(reply: string): boolean {
  const uncertainIndicators = [
    '我不确定', '我不知道', '我不清楚', '无法回答',
    '没有相关信息', '不太确定', '不清楚', '没法回答',
    'I don\'t know', 'I\'m not sure', 'uncertain',
  ];
  const lowerReply = reply.toLowerCase();
  return uncertainIndicators.some(indicator => lowerReply.includes(indicator.toLowerCase()));
}
