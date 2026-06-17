import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const answered = req.query.answered === 'true';

  try {
    const result = await query(
      `SELECT uq.*, a.target_name
       FROM unknown_queries uq
       JOIN avatars a ON a.id = uq.avatar_id
       WHERE a.creator_id = $1 AND uq.answered = $2
       ORDER BY uq.created_at DESC`,
      [userId, answered]
    );

    res.json({ queries: result.rows });
  } catch (err) {
    console.error('Get unknown queries error:', err);
    res.status(500).json({ error: '获取未知问题失败' });
  }
});

router.post('/:id/respond', authenticate, async (req: AuthRequest, res: Response) => {
  const queryId = parseInt(req.params.id);
  const { answer } = req.body;

  try {
    const result = await query(
      `UPDATE unknown_queries uq
       SET answered = TRUE
       FROM avatars a
       WHERE uq.id = $1 AND uq.avatar_id = a.id AND a.creator_id = $2
       RETURNING uq.id, uq.avatar_id, uq.question`,
      [queryId, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '未知问题不存在或无权操作' });
    }

    await query(
      'INSERT INTO preset_answers (avatar_id, keywords, question, answer) VALUES ($1, $2, $3, $4)',
      [result.rows[0].avatar_id, result.rows[0].question.slice(0, 100), result.rows[0].question, answer]
    );

    res.json({ message: '已回复并保存为预设问答' });
  } catch (err) {
    console.error('Respond to unknown query error:', err);
    res.status(500).json({ error: '回复失败' });
  }
});

export default router;
