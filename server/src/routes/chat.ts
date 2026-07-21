import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { query, withTransaction } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { chatAuthenticate } from '../middleware/chatAuth';
import { handleChatMessage } from '../services/chat';
import { rateLimiter } from '../middleware/rateLimiter';
import { ensureConversationForAvatar } from '../services/conversations';
import { extractMemoriesFromUserMessage } from '../services/memoryExtraction';
import { parsePositiveInt } from '../utils/params';

const router = Router();

router.post(
  '/message',
  rateLimiter(60000, 20),
  [
    body('avatar_id').isInt().withMessage('无效的头像配置'),
    body('conversation_id').optional({ nullable: true }).isInt().withMessage('无效的会话'),
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

    const { avatar_id, content, device_token, conversation_id } = req.body;

    try {
      const avatarId = Number(avatar_id);
      const accessType = (req as any).isCreator ? 'creator' : 'pairing';

      // P0-2: 如果传了 conversation_id，校验该会话属于当前 avatar 且 access_type 匹配
      if (conversation_id) {
        const convCheck = await query(
          'SELECT id FROM conversations WHERE id = $1 AND avatar_id = $2 AND access_type = $3',
          [Number(conversation_id), avatarId, accessType]
        );
        if (convCheck.rows.length === 0) {
          return res.status(403).json({ error: '无权访问该会话' });
        }
      }

      const conversationId = await ensureConversationForAvatar(
        avatarId,
        conversation_id ? Number(conversation_id) : null,
        accessType,
        device_token
      );
      const reply = await handleChatMessage(avatarId, content, device_token, conversationId);
      let userMessageId = 0;

      await withTransaction(async (client) => {
        const userMessage = await client.query(
          'INSERT INTO chat_messages (avatar_id, conversation_id, role, content) VALUES ($1, $2, $3, $4) RETURNING id',
          [avatarId, conversationId, 'user', content]
        );
        userMessageId = userMessage.rows[0].id;
        await client.query(
          'INSERT INTO chat_messages (avatar_id, conversation_id, role, content) VALUES ($1, $2, $3, $4)',
          [avatarId, conversationId, 'ai', reply]
        );
      });

      // P0-5: 记忆提取改为 fire-and-forget，失败不影响用户响应
      extractMemoriesFromUserMessage(avatarId, conversationId, userMessageId, content)
        .catch(e => console.error('Memory extraction failed:', e));

      res.json({ reply, conversation_id: conversationId });
    } catch (err) {
      console.error('Chat message error:', err);
      res.status(500).json({ error: '发送消息失败，请稍后重试' });
    }
  }
);

router.get('/history/:avatar_id', chatAuthenticate, async (req: AuthRequest, res: Response) => {
  const avatarId = parsePositiveInt(req.params.avatar_id);
  if (!avatarId) {
    return res.status(400).json({ error: '无效的头像配置' });
  }
  const conversationId = req.query.conversation_id
    ? parsePositiveInt(req.query.conversation_id as string)
    : null;
  if (req.query.conversation_id && !conversationId) {
    return res.status(400).json({ error: '无效的会话' });
  }
  const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 50, 200));

  try {
    // P0-2: 如果传了 conversation_id，校验该会话属于当前 avatar
    if (conversationId) {
      const convCheck = await query(
        'SELECT id FROM conversations WHERE id = $1 AND avatar_id = $2',
        [conversationId, avatarId]
      );
      if (convCheck.rows.length === 0) {
        return res.status(403).json({ error: '无权访问该会话' });
      }
    }

    const where = conversationId
      ? 'avatar_id = $1 AND conversation_id = $2'
      : 'avatar_id = $1';
    const params = conversationId ? [avatarId, conversationId, limit] : [avatarId, limit];
    const result = await query(
      `SELECT id, role, content, created_at, conversation_id
       FROM chat_messages
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${conversationId ? 3 : 2}`,
      params
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
    body('conversation_id').optional({ nullable: true }).isInt().withMessage('无效的会话'),
    body('content').isLength({ min: 1, max: 2000 }).withMessage('回复内容长度需在 1-2000 之间'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { avatar_id, content, conversation_id } = req.body;

    try {
      const avatar = await query(
        'SELECT id FROM avatars WHERE id = $1 AND creator_id = $2',
        [avatar_id, req.user!.id]
      );
      if (avatar.rows.length === 0) {
        return res.status(403).json({ error: '无权操作该角色' });
      }

      const conversationId = await ensureConversationForAvatar(
        Number(avatar_id),
        conversation_id ? Number(conversation_id) : null,
        'creator'
      );

      await query(
        'INSERT INTO chat_messages (avatar_id, conversation_id, role, content) VALUES ($1, $2, $3, $4)',
        [avatar_id, conversationId, 'creator', content]
      );

      res.json({ message: '回复已发送', conversation_id: conversationId });
    } catch (err) {
      console.error('Creator reply error:', err);
      res.status(500).json({ error: '发送回复失败' });
    }
  }
);

export default router;
