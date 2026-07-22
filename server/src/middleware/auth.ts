import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';

export interface AuthRequest extends Request {
  user?: { id: number; email: string };
  isCreator?: boolean;
  userId?: number;
  avatarId?: number;
}

export interface PairingJwtPayload {
  type: 'pairing';
  avatarId: number;
}

export interface CreatorJwtPayload {
  id: number;
  email: string;
}

export type JwtPayload = PairingJwtPayload | CreatorJwtPayload;

export function isPairingPayload(decoded: unknown): decoded is PairingJwtPayload {
  return typeof decoded === 'object' && decoded !== null && 'type' in decoded && (decoded as any).type === 'pairing';
}

export function isCreatorPayload(decoded: unknown): decoded is CreatorJwtPayload {
  return typeof decoded === 'object' && decoded !== null && 'id' in decoded;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    req.user = decoded;
    next();
  } catch (err) {
    console.warn('JWT verify failed (auth):', (err as Error)?.message);
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

export function generateToken(user: { id: number; email: string }) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}
