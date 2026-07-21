import { Router, Response } from 'express';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { parsePositiveInt } from '../utils/params';

const router = Router();

const PERSONALITY_TRAIT_KEYS = ['extroversion', 'humor', 'warmth', 'patience', 'curiosity'];
const DIALOGUE_PREF_KEYS = ['reply_length', 'use_emoji', 'formality', 'topic_depth'];

function isValidPersonalityTraits(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val !== 'object' || Array.isArray(val)) return false;
  const obj = val as Record<string, unknown>;
  for (const [key, v] of Object.entries(obj)) {
    if (!PERSONALITY_TRAIT_KEYS.includes(key)) return false;
    if (typeof v !== 'number' || v < 0 || v > 10) return false;
  }
  return true;
}

function isValidInterests(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (!Array.isArray(val)) return false;
  return val.every((item: unknown) => typeof item === 'string' && item.length <= 50);
}

function isValidDialoguePreferences(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val !== 'object' || Array.isArray(val)) return false;
  const obj = val as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!DIALOGUE_PREF_KEYS.includes(key)) return false;
  }
  if ('reply_length' in obj && !['short', 'medium', 'long'].includes(obj.reply_length as string)) return false;
  if ('use_emoji' in obj && typeof obj.use_emoji !== 'boolean') return false;
  if ('formality' in obj && !['casual', 'normal', 'formal'].includes(obj.formality as string)) return false;
  if ('topic_depth' in obj && !['shallow', 'normal', 'deep'].includes(obj.topic_depth as string)) return false;
  return true;
}

export function generatePairingCode(): string {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

async function insertAvatarWithUniqueCode(
  columns: string,
  values: any[],
  codeParamIndex: number
): Promise<any> {
  const MAX_RETRIES = 5;
  for (let i = 0; i < MAX_RETRIES; i++) {
    const code = generatePairingCode();
    values[codeParamIndex] = code;
    const result = await query(
      `INSERT INTO avatars (${columns}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (pairing_code) DO NOTHING
       RETURNING *`,
      values
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }
  }
  throw new Error('生成唯一配对码失败，请稍后重试');
}

router.post(
  '/',
  authenticate,
  [
    body('name').notEmpty().withMessage('请输入头像名称'),
    body('target_name').notEmpty().withMessage('请输入聊天对象名称'),
    body('persona').optional().isString(),
    body('ai_tone').optional().isString(),
    body('age').optional().isInt({ min: 1, max: 150 }).withMessage('年龄需在1-150之间'),
    body('occupation').optional().isString().isLength({ max: 100 }),
    body('relationship').optional().isString().isLength({ max: 50 }),
    body('personality_traits').optional().custom(isValidPersonalityTraits).withMessage('personality_traits 格式无效，需为 {extroversion|humor|warmth|patience|curiosity: 0-10}'),
    body('interests').optional().custom(isValidInterests).withMessage('interests 需为字符串数组，每项最多50字符'),
    body('dialogue_preferences').optional().custom(isValidDialoguePreferences).withMessage('dialogue_preferences 格式无效'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, target_name, persona, ai_tone, age, occupation, relationship, personality_traits, interests, dialogue_preferences } = req.body;
    const creatorId = req.user!.id;

    try {
      const values = [
        creatorId, name, target_name,
        persona || '', ai_tone || '语气亲切、温柔，像家人一样聊天', null,
        age || null, occupation || null, relationship || null,
        personality_traits ? JSON.stringify(personality_traits) : null,
        interests ? JSON.stringify(interests) : null,
        dialogue_preferences ? JSON.stringify(dialogue_preferences) : null,
      ];

      const avatar = await insertAvatarWithUniqueCode(
        'creator_id, name, target_name, persona, ai_tone, pairing_code, age, occupation, relationship, personality_traits, interests, dialogue_preferences',
        values,
        5
      );

      const fullAvatar = await query(
        `SELECT a.*,
          (SELECT COUNT(*) FROM preset_answers WHERE avatar_id = a.id) as preset_count,
          (SELECT COUNT(*) FROM unknown_queries WHERE avatar_id = a.id AND answered = false) as unanswered_count
         FROM avatars a WHERE a.id = $1`,
        [avatar.id]
      );

      res.status(201).json({ avatar: fullAvatar.rows[0] });
    } catch (err) {
      console.error('Create avatar error:', err);
      res.status(500).json({ error: err instanceof Error ? err.message : '创建头像配置失败' });
    }
  }
);

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT a.*,
        (SELECT COUNT(*) FROM preset_answers WHERE avatar_id = a.id) as preset_count,
        (SELECT COUNT(*) FROM unknown_queries WHERE avatar_id = a.id AND answered = false) as unanswered_count
       FROM avatars a WHERE a.creator_id = $1
       ORDER BY a.created_at DESC`,
      [req.user!.id]
    );

    res.json({ avatars: result.rows });
  } catch (err) {
    console.error('Get avatars error:', err);
    res.status(500).json({ error: '获取头像列表失败' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const avatarId = parsePositiveInt(req.params.id);
  if (!avatarId) {
    return res.status(400).json({ error: '无效的头像配置' });
  }
  const creatorId = req.user!.id;

  try {
    const result = await query(
      `SELECT a.*,
        (SELECT COUNT(*) FROM preset_answers WHERE avatar_id = a.id) as preset_count,
        (SELECT COUNT(*) FROM unknown_queries WHERE avatar_id = a.id AND answered = false) as unanswered_count
       FROM avatars a WHERE a.id = $1 AND a.creator_id = $2`,
      [avatarId, creatorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '头像配置不存在' });
    }

    res.json({ avatar: result.rows[0] });
  } catch (err) {
    console.error('Get avatar error:', err);
    res.status(500).json({ error: '获取头像配置失败' });
  }
});

router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().notEmpty(),
    body('target_name').optional().notEmpty(),
    body('persona').optional().isString(),
    body('ai_tone').optional().isString(),
    body('age').optional({ nullable: true }).isInt({ min: 1, max: 150 }).withMessage('年龄需在1-150之间'),
    body('occupation').optional({ nullable: true }).isString().isLength({ max: 100 }),
    body('relationship').optional({ nullable: true }).isString().isLength({ max: 50 }),
    body('personality_traits').optional({ nullable: true }).custom(isValidPersonalityTraits).withMessage('personality_traits 格式无效'),
    body('interests').optional({ nullable: true }).custom(isValidInterests).withMessage('interests 需为字符串数组'),
    body('dialogue_preferences').optional({ nullable: true }).custom(isValidDialoguePreferences).withMessage('dialogue_preferences 格式无效'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const avatarId = parsePositiveInt(req.params.id);
    if (!avatarId) {
      return res.status(400).json({ error: '无效的头像配置' });
    }
    const { name, target_name, persona, ai_tone, age, occupation, relationship, personality_traits, interests, dialogue_preferences } = req.body;
    const creatorId = req.user!.id;

    try {
      const avatar = await query('SELECT id FROM avatars WHERE id = $1 AND creator_id = $2', [avatarId, creatorId]);
      if (avatar.rows.length === 0) {
        return res.status(404).json({ error: '头像配置不存在' });
      }

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (name !== undefined) {
        updates.push(`name = $${idx++}`);
        values.push(name);
      }
      if (target_name !== undefined) {
        updates.push(`target_name = $${idx++}`);
        values.push(target_name);
      }
      if (persona !== undefined) {
        updates.push(`persona = $${idx++}`);
        values.push(persona);
      }
      if (ai_tone !== undefined) {
        updates.push(`ai_tone = $${idx++}`);
        values.push(ai_tone);
      }
      if (age !== undefined) {
        updates.push(`age = $${idx++}`);
        values.push(age);
      }
      if (occupation !== undefined) {
        updates.push(`occupation = $${idx++}`);
        values.push(occupation);
      }
      if (relationship !== undefined) {
        updates.push(`relationship = $${idx++}`);
        values.push(relationship);
      }
      if (personality_traits !== undefined) {
        updates.push(`personality_traits = $${idx++}`);
        values.push(personality_traits ? JSON.stringify(personality_traits) : null);
      }
      if (interests !== undefined) {
        updates.push(`interests = $${idx++}`);
        values.push(interests ? JSON.stringify(interests) : null);
      }
      if (dialogue_preferences !== undefined) {
        updates.push(`dialogue_preferences = $${idx++}`);
        values.push(dialogue_preferences ? JSON.stringify(dialogue_preferences) : null);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: '没有要更新的内容' });
      }

      values.push(avatarId);
      const result = await query(
        `UPDATE avatars SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      const fullAvatar = await query(
        `SELECT a.*,
          (SELECT COUNT(*) FROM preset_answers WHERE avatar_id = a.id) as preset_count,
          (SELECT COUNT(*) FROM unknown_queries WHERE avatar_id = a.id AND answered = false) as unanswered_count
         FROM avatars a WHERE a.id = $1`,
        [avatarId]
      );

      res.json({ avatar: fullAvatar.rows[0] });
    } catch (err) {
      console.error('Update avatar error:', err);
      res.status(500).json({ error: '更新头像配置失败' });
    }
  }
);

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const avatarId = parsePositiveInt(req.params.id);
  if (!avatarId) {
    return res.status(400).json({ error: '无效的头像配置' });
  }
  const creatorId = req.user!.id;

  try {
    const avatar = await query('SELECT id FROM avatars WHERE id = $1 AND creator_id = $2', [avatarId, creatorId]);
    if (avatar.rows.length === 0) {
      return res.status(404).json({ error: '头像配置不存在' });
    }

    await query('DELETE FROM avatars WHERE id = $1', [avatarId]);
    res.json({ message: '已删除' });
  } catch (err) {
    console.error('Delete avatar error:', err);
    res.status(500).json({ error: '删除头像配置失败' });
  }
});

router.post('/:id/regenerate-code', authenticate, async (req: AuthRequest, res: Response) => {
  const avatarId = parsePositiveInt(req.params.id);
  if (!avatarId) {
    return res.status(400).json({ error: '无效的头像配置' });
  }
  const creatorId = req.user!.id;

  try {
    const avatar = await query('SELECT id FROM avatars WHERE id = $1 AND creator_id = $2', [avatarId, creatorId]);
    if (avatar.rows.length === 0) {
      return res.status(404).json({ error: '头像配置不存在' });
    }

    let pairingCode: string | null = null;
    for (let i = 0; i < 5; i++) {
      const code = generatePairingCode();
      const conflictCheck = await query(
        'UPDATE avatars SET pairing_code = $1 WHERE id = $2 AND NOT EXISTS (SELECT 1 FROM avatars WHERE pairing_code = $1 AND id <> $2) RETURNING pairing_code',
        [code, avatarId]
      );
      if (conflictCheck.rows.length > 0) {
        pairingCode = conflictCheck.rows[0].pairing_code;
        break;
      }
    }

    if (!pairingCode) {
      return res.status(500).json({ error: '生成唯一配对码失败，请稍后重试' });
    }

    res.json({ pairing_code: pairingCode });
  } catch (err) {
    console.error('Regenerate code error:', err);
    res.status(500).json({ error: '重新生成配对码失败' });
  }
});

router.get('/:id/preset-answers', authenticate, async (req: AuthRequest, res: Response) => {
  const avatarId = parsePositiveInt(req.params.id);
  if (!avatarId) {
    return res.status(400).json({ error: '无效的头像配置' });
  }
  const creatorId = req.user!.id;

  try {
    const avatar = await query('SELECT id FROM avatars WHERE id = $1 AND creator_id = $2', [avatarId, creatorId]);
    if (avatar.rows.length === 0) {
      return res.status(404).json({ error: '头像配置不存在' });
    }

    const result = await query(
      'SELECT id, keywords, question, answer, created_at FROM preset_answers WHERE avatar_id = $1 ORDER BY created_at DESC',
      [avatarId]
    );

    res.json({ preset_answers: result.rows });
  } catch (err) {
    console.error('Get preset answers error:', err);
    res.status(500).json({ error: '获取预设问答失败' });
  }
});

router.post(
  '/:id/preset-answers',
  authenticate,
  [
    body('keywords').notEmpty().withMessage('请输入关键词'),
    body('question').notEmpty().withMessage('请输入问题'),
    body('answer').notEmpty().withMessage('请输入回答'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const avatarId = parsePositiveInt(req.params.id);
    if (!avatarId) {
      return res.status(400).json({ error: '无效的头像配置' });
    }
    const creatorId = req.user!.id;
    const { keywords, question, answer } = req.body;

    try {
      const avatar = await query('SELECT id FROM avatars WHERE id = $1 AND creator_id = $2', [avatarId, creatorId]);
      if (avatar.rows.length === 0) {
        return res.status(404).json({ error: '头像配置不存在' });
      }

      const result = await query(
        'INSERT INTO preset_answers (avatar_id, keywords, question, answer) VALUES ($1, $2, $3, $4) RETURNING *',
        [avatarId, keywords, question, answer]
      );

      res.status(201).json({ preset_answer: result.rows[0] });
    } catch (err) {
      console.error('Create preset answer error:', err);
      res.status(500).json({ error: '添加预设问答失败' });
    }
  }
);

router.delete('/:pid/preset-answers/:aid', authenticate, async (req: AuthRequest, res: Response) => {
  const avatarId = parsePositiveInt(req.params.pid);
  const answerId = parsePositiveInt(req.params.aid);
  if (!avatarId || !answerId) {
    return res.status(400).json({ error: '无效的预设问答' });
  }
  const creatorId = req.user!.id;

  try {
    const avatar = await query('SELECT id FROM avatars WHERE id = $1 AND creator_id = $2', [avatarId, creatorId]);
    if (avatar.rows.length === 0) {
      return res.status(404).json({ error: '头像配置不存在' });
    }

    await query('DELETE FROM preset_answers WHERE id = $1 AND avatar_id = $2', [answerId, avatarId]);
    res.json({ message: '已删除' });
  } catch (err) {
    console.error('Delete preset answer error:', err);
    res.status(500).json({ error: '删除预设问答失败' });
  }
});

export default router;
