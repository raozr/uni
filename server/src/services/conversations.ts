import { query } from '../db';

export async function createConversation(
  avatarId: number,
  accessType: 'pairing' | 'creator' | 'legacy' = 'pairing',
  deviceToken?: string
): Promise<number> {
  const result = await query(
    `INSERT INTO conversations (avatar_id, access_type, device_token)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [avatarId, accessType, deviceToken || null]
  );
  return result.rows[0].id;
}

export async function ensureConversationForAvatar(
  avatarId: number,
  conversationId?: number | null,
  accessType: 'pairing' | 'creator' | 'legacy' = 'legacy',
  deviceToken?: string
): Promise<number> {
  if (conversationId) {
    const existing = await query(
      'SELECT id FROM conversations WHERE id = $1 AND avatar_id = $2',
      [conversationId, avatarId]
    );
    if (existing.rows.length > 0) return conversationId;
  }

  const existingLegacy = await query(
    `SELECT id FROM conversations
     WHERE avatar_id = $1 AND access_type = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [avatarId, accessType]
  );
  if (existingLegacy.rows.length > 0) return existingLegacy.rows[0].id;

  return createConversation(avatarId, accessType, deviceToken);
}
