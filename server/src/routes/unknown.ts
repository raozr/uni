import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query, withTransaction } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { parsePositiveInt } from '../utils/params';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const answeredParam = req.query.answered as string | undefined;

  try {
    let whereClause = 'a.creator_id = $1';
    const params: any[] = [userId];

    if (answeredParam !== 'all') {
      const answered = answeredParam === 'true';
      whereClause += ' AND uq.answered = $2';
      params.push(answered);
    }

    const result = await query(
      `SELECT uq.*, a.target_name
       FROM unknown_queries uq
       JOIN avatars a ON a.id = uq.avatar_id
       WHERE ${whereClause}
       ORDER BY uq.created_at DESC`,
      params
    );

    res.json({ queries: result.rows });
  } catch (err) {
    console.error('Get unknown queries error:', err);
    res.status(500).json({ error: '获取未知问题失败' });
  }
});

router.post(
  '/:id/respond',
  authenticate,
  [
    body('answer').isLength({ min: 1, max: 2000 }).withMessage('回答内容长度需在 1-2000 之间'),
  ],
  async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const queryId = parsePositiveInt(req.params.id);
  if (!queryId) {
    return res.status(400).json({ error: '无效的问题' });
  }
  const { answer } = req.body;

  try {
    const result = await withTransaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE unknown_queries uq
         SET answered = TRUE
         FROM avatars a
         WHERE uq.id = $1 AND uq.avatar_id = a.id AND a.creator_id = $2
         RETURNING uq.id, uq.avatar_id, uq.question`,
        [queryId, req.user!.id]
      );

      if (updateResult.rows.length === 0) {
        throw new Error('NOT_FOUND');
      }

      await client.query(
        'INSERT INTO preset_answers (avatar_id, keywords, question, answer) VALUES ($1, $2, $3, $4)',
        [updateResult.rows[0].avatar_id, updateResult.rows[0].question.slice(0, 100), updateResult.rows[0].question, answer]
      );

      return updateResult.rows[0];
    });

    res.json({ message: '已回复并保存为预设问答' });
  } catch (err: any) {
    if (err?.message === 'NOT_FOUND') {
      return res.status(404).json({ error: '未知问题不存在或无权操作' });
    }
    console.error('Respond to unknown query error:', err);
    res.status(500).json({ error: '回复失败' });
  }
});

export default router;
