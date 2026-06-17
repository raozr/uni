import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { authenticate, generateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// 管理员注册
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('请输入有效的邮箱'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
    body('name').notEmpty().withMessage('请输入姓名'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    try {
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: '该邮箱已注册' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const result = await query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email, passwordHash, name]
      );

      const user = result.rows[0];
      const token = generateToken({ id: user.id, email: user.email });

      res.status(201).json({
        token,
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: '注册失败，请稍后重试' });
    }
  }
);

// 管理员登录
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('请输入有效的邮箱'),
    body('password').notEmpty().withMessage('请输入密码'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const result = await query('SELECT id, email, password_hash, name FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: '邮箱或密码错误' });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: '邮箱或密码错误' });
      }

      const token = generateToken({ id: user.id, email: user.email });

      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: '登录失败，请稍后重试' });
    }
  }
);

// 获取当前用户信息
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT id, email, name, created_at FROM users WHERE id = $1', [req.user!.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

export default router;
