import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { JWT_SECRET } from '../config';
import { parsePositiveInt } from '../utils/params';

export async function chatAuthenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '需要登录或配对后才能聊天' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.type === 'pairing') {
      const avatarId = parsePositiveInt((req.params.avatar_id || req.body.avatar_id)?.toString());
      if (!avatarId) {
        return res.status(400).json({ error: '无效的头像配置' });
      }
      if (decoded.avatarId !== avatarId) {
        return res.status(403).json({ error: '无权访问该分身' });
      }
      (req as any).isCreator = false;
      (req as any).avatarId = avatarId;
      return next();
    }

    if (decoded.id) {
      const avatarId = parsePositiveInt((req.params.avatar_id || req.body.avatar_id)?.toString());
      if (!avatarId) {
        return res.status(400).json({ error: '无效的头像配置' });
      }
      const result = await query('SELECT * FROM avatars WHERE id = $1 AND creator_id = $2', [avatarId, decoded.id]);
      if (result.rows.length === 0) {
        return res.status(403).json({ error: '无权访问该分身' });
      }
      (req as any).isCreator = true;
      (req as any).userId = decoded.id;
      (req as any).avatarId = avatarId;
      return next();
    }

    return res.status(401).json({ error: '无效的 token' });
  } catch (err) {
    console.warn('JWT verify failed (chatAuth):', (err as Error)?.message);
    return res.status(401).json({ error: '无效的 token' });
  }
}
