const rawJwtSecret = process.env.JWT_SECRET;

if (!rawJwtSecret || rawJwtSecret.length < 16) {
  throw new Error('JWT_SECRET 环境变量未设置或长度不足 16 位，服务无法启动');
}

export const JWT_SECRET: string = rawJwtSecret;

export const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
