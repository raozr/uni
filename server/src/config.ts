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
export const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';

export const PUSH_ENABLED = process.env.PUSH_ENABLED === 'true';
export const EXPO_PUSH_ENDPOINT = process.env.EXPO_PUSH_ENDPOINT || 'https://exp.host/--/api/v2/push/send';
