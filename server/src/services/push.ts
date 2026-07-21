import { PUSH_ENABLED, EXPO_PUSH_ENDPOINT } from '../config';

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
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
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Push notification failed ${response.status}: ${text}`);
    }
  } catch (err) {
    console.error('Push notification error:', err instanceof Error ? err.message : err);
  } finally {
    clearTimeout(timeout);
  }
}
