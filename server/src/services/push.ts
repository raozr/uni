const PUSH_ENABLED = process.env.PUSH_ENABLED === 'true';
const PUSH_ENDPOINT = process.env.EXPO_PUSH_ENDPOINT || 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  title: string;
  body: string;
  avatarId: number;
  to?: string;
}

export async function sendPushNotification(payload: PushPayload): Promise<void> {
  if (!PUSH_ENABLED) {
    return;
  }
  if (!payload.to) {
    console.warn('[Push] 缺少 device token，跳过通知', { avatarId: payload.avatarId });
    return;
  }

  const response = await fetch(PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: payload.to,
      title: payload.title,
      body: payload.body,
      data: { avatarId: payload.avatarId },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Push notification failed ${response.status}: ${text}`);
  }
}
