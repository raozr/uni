import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { JWT_SECRET } from '../config';

const router = Router();

router.post(
  '/verify',
  rateLimiter(60000, 5),
  [body('code').isLength({ min: 6, max: 6 }).withMessage('请输入6位数字配对码')],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code } = req.body;

    try {
      const result = await query(
        'SELECT id, name, target_name FROM avatars WHERE pairing_code = $1',
        [code]
      );

      if (result.rows.length === 0) {
        console.log(`Pairing verification failed from ${req.ip}: code=${code}`);
        return res.status(401).json({ error: '配对码无效，请检查后重新输入' });
      }

      const avatar = result.rows[0];

      const pairing_token = jwt.sign(
        { avatarId: avatar.id, type: 'pairing' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        avatar_id: avatar.id,
        avatar_name: avatar.name,
        target_name: avatar.target_name,
        pairing_token,
      });
    } catch (err) {
      console.error('Verify pairing code error:', err);
      res.status(500).json({ error: '验证失败，请稍后重试' });
    }
  }
);

router.get('/avatar/:id', async (req: AuthRequest, res: Response) => {
  const avatarId = parseInt(req.params.id);

  const authHeader = req.headers.authorization;
  let hasAccess = false;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.type === 'pairing' && decoded.avatarId === avatarId) {
        hasAccess = true;
      }
    } catch {}
  }

  try {
    const result = await query(
      'SELECT id, name, target_name, persona, ai_tone FROM avatars WHERE id = $1',
      [avatarId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '头像配置不存在' });
    }

    if (!hasAccess) {
      return res.json({ avatar: { ...result.rows[0], persona: undefined, ai_tone: undefined } });
    }

    res.json({ avatar: result.rows[0] });
  } catch (err) {
    console.error('Get pairing avatar error:', err);
    res.status(500).json({ error: '获取角色信息失败' });
  }
});

export default router;
