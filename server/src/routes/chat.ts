import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { query, withTransaction } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { chatAuthenticate } from '../middleware/chatAuth';
import { handleChatMessage } from '../services/chat';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post(
  '/message',
  rateLimiter(60000, 20),
  [
    body('avatar_id').isInt().withMessage('无效的头像配置'),
    body('content').isLength({ min: 1, max: 2000 }).withMessage('消息内容长度需在 1-2000 之间'),
    body('device_token').optional().isString(),
  ],
  (req: Request, res: Response, next: NextFunction) => {
    req.params.avatar_id = req.body.avatar_id?.toString();
    next();
  },
  chatAuthenticate,
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { avatar_id, content, device_token } = req.body;

    try {
      const reply = await handleChatMessage(avatar_id, content, device_token);

      await withTransaction(async (client) => {
        await client.query(
          'INSERT INTO chat_messages (avatar_id, role, content) VALUES ($1, $2, $3)',
          [avatar_id, 'user', content]
        );
        await client.query(
          'INSERT INTO chat_messages (avatar_id, role, content) VALUES ($1, $2, $3)',
          [avatar_id, 'ai', reply]
        );
      });

      res.json({ reply });
    } catch (err) {
      console.error('Chat message error:', err);
      res.status(500).json({ error: '发送消息失败，请稍后重试' });
    }
  }
);

router.get('/history/:avatar_id', chatAuthenticate, async (req: AuthRequest, res: Response) => {
  const avatarId = parseInt(req.params.avatar_id);
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

  try {
    const result = await query(
      'SELECT id, role, content, created_at FROM chat_messages WHERE avatar_id = $1 ORDER BY created_at DESC LIMIT $2',
      [avatarId, limit]
    );

    res.json({ messages: result.rows.reverse() });
  } catch (err) {
    console.error('Get chat history error:', err);
    res.status(500).json({ error: '获取聊天记录失败' });
  }
});

router.post(
  '/creator-reply',
  authenticate,
  [
    body('avatar_id').isInt().withMessage('无效的头像配置'),
    body('content').isLength({ min: 1, max: 2000 }).withMessage('回复内容长度需在 1-2000 之间'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { avatar_id, content } = req.body;

    try {
      const avatar = await query(
        'SELECT id FROM avatars WHERE id = $1 AND creator_id = $2',
        [avatar_id, req.user!.id]
      );
      if (avatar.rows.length === 0) {
        return res.status(403).json({ error: '无权操作该角色' });
      }

      await query(
        'INSERT INTO chat_messages (avatar_id, role, content) VALUES ($1, $2, $3)',
        [avatar_id, 'creator', content]
      );

      res.json({ message: '回复已发送' });
    } catch (err) {
      console.error('Creator reply error:', err);
      res.status(500).json({ error: '发送回复失败' });
    }
  }
);

export default router;
