import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { parsePositiveInt } from '../utils/params';

const router = Router();

async function verifyAvatarOwnership(avatarId: number, userId: number) {
  const result = await query(
    'SELECT * FROM avatars WHERE id = $1 AND creator_id = $2',
    [avatarId, userId]
  );
  return result.rows.length > 0;
}

router.get('/:avatarId/memories', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const avatarId = parsePositiveInt(req.params.avatarId);
    if (!avatarId) {
      return res.status(400).json({ error: '无效的分身' });
    }
    const userId = req.user!.id;

    if (!(await verifyAvatarOwnership(avatarId, userId))) {
      return res.status(403).json({ error: '无权操作该分身' });
    }

    const result = await query(
      'SELECT * FROM avatar_memories WHERE avatar_id = $1 ORDER BY created_at DESC',
      [avatarId]
    );

    res.json({ memories: result.rows });
  } catch (err) {
    console.error('Get memories error:', err);
    res.status(500).json({ error: '获取记忆失败' });
  }
});

router.post('/:avatarId/memories', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const avatarId = parsePositiveInt(req.params.avatarId);
    if (!avatarId) {
      return res.status(400).json({ error: '无效的分身' });
    }
    const userId = req.user!.id;
    const { key, content } = req.body;

    if (!key || !content) {
      return res.status(400).json({ error: '记忆标题和内容不能为空' });
    }

    if (key.length > 100) {
      return res.status(400).json({ error: '记忆标题不能超过 100 字符' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: '记忆内容不能超过 2000 字符' });
    }

    if (!(await verifyAvatarOwnership(avatarId, userId))) {
      return res.status(403).json({ error: '无权操作该分身' });
    }

    const result = await query(
      `INSERT INTO avatar_memories (avatar_id, key, content, source)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (avatar_id, key) DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [avatarId, key, content, 'manual']
    );

    res.status(201).json({ memory: result.rows[0] });
  } catch (err) {
    console.error('Create memory error:', err);
    res.status(500).json({ error: '创建记忆失败' });
  }
});

router.put('/:avatarId/memories/:memoryId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const avatarId = parsePositiveInt(req.params.avatarId);
    const memoryId = parsePositiveInt(req.params.memoryId);
    if (!avatarId || !memoryId) {
      return res.status(400).json({ error: '无效的记忆' });
    }
    const userId = req.user!.id;
    const { key, content } = req.body;

    if (!(await verifyAvatarOwnership(avatarId, userId))) {
      return res.status(403).json({ error: '无权操作该分身' });
    }

    if (key && key.length > 100) {
      return res.status(400).json({ error: '记忆标题不能超过 100 字符' });
    }

    if (content && content.length > 2000) {
      return res.status(400).json({ error: '记忆内容不能超过 2000 字符' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (key !== undefined) {
      updates.push(`key = $${paramCount}`);
      values.push(key);
      paramCount++;
    }

    if (content !== undefined) {
      updates.push(`content = $${paramCount}`);
      values.push(content);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(memoryId, avatarId);

    const result = await query(
      `UPDATE avatar_memories SET ${updates.join(', ')} WHERE id = $${paramCount} AND avatar_id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    res.json({ memory: result.rows[0] });
  } catch (err) {
    console.error('Update memory error:', err);
    res.status(500).json({ error: '更新记忆失败' });
  }
});

router.delete('/:avatarId/memories/:memoryId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const avatarId = parsePositiveInt(req.params.avatarId);
    const memoryId = parsePositiveInt(req.params.memoryId);
    if (!avatarId || !memoryId) {
      return res.status(400).json({ error: '无效的记忆' });
    }
    const userId = req.user!.id;

    if (!(await verifyAvatarOwnership(avatarId, userId))) {
      return res.status(403).json({ error: '无权操作该分身' });
    }

    const result = await query(
      'DELETE FROM avatar_memories WHERE id = $1 AND avatar_id = $2',
      [memoryId, avatarId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '记忆不存在' });
    }

    res.json({ message: '已删除' });
  } catch (err) {
    console.error('Delete memory error:', err);
    res.status(500).json({ error: '删除记忆失败' });
  }
});

export default router;
