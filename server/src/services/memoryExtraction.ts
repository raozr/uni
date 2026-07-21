import { query } from '../db';

interface MemoryCandidate {
  key: string;
  content: string;
}

function normalizeValue(value: string): string {
  return value
    .replace(/[。！？!?,，；;].*$/, '')
    .trim()
    .slice(0, 120);
}

export function extractMemoryCandidates(message: string): MemoryCandidate[] {
  const candidates: MemoryCandidate[] = [];
  const rules: Array<{ key: string; pattern: RegExp; prefix: string }> = [
    { key: '喜欢', pattern: /我(?:很|最|比较)?喜欢([^。！？!?,，；;]{1,40})/, prefix: '喜欢' },
    { key: '不喜欢', pattern: /我(?:很|最|比较)?不喜欢([^。！？!?,，；;]{1,40})/, prefix: '不喜欢' },
    { key: '住址', pattern: /我住在([^。！？!?,，；;]{1,50})/, prefix: '住在' },
    { key: '称呼', pattern: /我叫([^。！？!?,，；;]{1,30})/, prefix: '叫' },
  ];

  for (const rule of rules) {
    const match = message.match(rule.pattern);
    if (!match?.[1]) continue;
    const value = normalizeValue(match[1]);
    if (!value) continue;
    candidates.push({
      key: `自动记忆-${rule.key}`,
      content: `聊天对象${rule.prefix}${value}`,
    });
  }

  return candidates;
}

export async function extractMemoriesFromUserMessage(
  avatarId: number,
  conversationId: number,
  messageId: number,
  message: string
): Promise<number> {
  const candidates = extractMemoryCandidates(message);
  for (const candidate of candidates) {
    await query(
      `INSERT INTO avatar_memories (avatar_id, key, content, source)
       VALUES ($1, $2, $3, 'auto')
       ON CONFLICT (avatar_id, key)
       DO UPDATE SET content = EXCLUDED.content, source = 'auto', updated_at = CURRENT_TIMESTAMP`,
      [avatarId, candidate.key, candidate.content]
    );
  }

  await query(
    `UPDATE conversations
     SET last_memory_extracted_message_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND avatar_id = $3`,
    [messageId, conversationId, avatarId]
  );

  return candidates.length;
}
