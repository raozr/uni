const PUSH_ENABLED = process.env.PUSH_ENABLED === 'true';

interface PushPayload {
  title: string;
  body: string;
  avatarId: number;
}

export async function sendPushNotification(payload: PushPayload): Promise<void> {
  if (!PUSH_ENABLED) {
    return;
  }
  console.warn('[Push] 推送服务未配置，跳过通知', payload);
}
