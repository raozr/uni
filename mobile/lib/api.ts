import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from './config';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function getPairingToken(): Promise<string | null> {
  return AsyncStorage.getItem('pairing_token');
}

const DEFAULT_TIMEOUT = 15000;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const callerHeaders = options.headers as Record<string, string> | undefined;
  const hasExplicitAuth = !!callerHeaders?.['Authorization'];

  if (callerHeaders) {
    Object.assign(mergedHeaders, callerHeaders);
  }

  if (authToken && !hasExplicitAuth) {
    mergedHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: mergedHeaders,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('请求超时，请检查网络后重试');
    }
    throw new Error('网络连接失败，请检查网络');
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    if (response.status === 401 && authToken) {
      setAuthToken(null);
      await AsyncStorage.multiRemove(['auth_token', 'user']);
      if (onUnauthorized) onUnauthorized();
    }
    throw new Error(data.error || `请求失败 (${response.status})`);
  }

  return data as T;
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<{ user: any }>('/auth/me'),
};

export interface AvatarData {
  name: string;
  target_name: string;
  persona?: string;
  ai_tone?: string;
  age?: number | null;
  occupation?: string | null;
  relationship?: string | null;
  personality_traits?: Record<string, number> | null;
  interests?: string[] | null;
  dialogue_preferences?: Record<string, any> | null;
}

export interface AvatarUpdateData {
  name?: string;
  target_name?: string;
  persona?: string;
  ai_tone?: string;
  age?: number | null;
  occupation?: string | null;
  relationship?: string | null;
  personality_traits?: Record<string, number> | null;
  interests?: string[] | null;
  dialogue_preferences?: Record<string, any> | null;
}

export const avatarApi = {
  create: (data: AvatarData) =>
    request<{ avatar: any }>('/avatars', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAll: () =>
    request<{ avatars: any[] }>('/avatars'),

  getMine: async () => {
    const data: any = await request('/avatars');
    const avatars = data.avatars || [];
    if (avatars.length === 0) return { profile: null, preset_count: 0, unanswered_count: 0 };
    const avatar = avatars[0];
    return {
      profile: avatar,
      preset_count: avatar.preset_count || 0,
      unanswered_count: avatar.unanswered_count || 0,
    };
  },

  getById: (id: number) =>
    request<{ avatar: any }>(`/avatars/${id}`),

  update: (id: number, data: AvatarUpdateData) =>
    request<{ avatar: any }>(`/avatars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request(`/avatars/${id}`, {
      method: 'DELETE',
    }),

  regenerateCode: (id: number) =>
    request<{ pairing_code: string }>(`/avatars/${id}/regenerate-code`, {
      method: 'POST',
    }),

  getPresetAnswers: (id: number) =>
    request<{ preset_answers: any[] }>(`/avatars/${id}/preset-answers`),

  addPresetAnswer: (id: number, data: { keywords: string; question: string; answer: string }) =>
    request<{ preset_answer: any }>(`/avatars/${id}/preset-answers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deletePresetAnswer: (avatarId: number, answerId: number) =>
    request(`/avatars/${avatarId}/preset-answers/${answerId}`, {
      method: 'DELETE',
    }),
};

export const pairingApi = {
  verifyCode: (code: string) =>
    request<{ success: boolean; avatar_id: number; avatar_name: string; target_name: string; pairing_token: string }>('/pairing/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  getAvatar: (id: number) =>
    request<{ avatar: any }>(`/pairing/avatar/${id}`),
};

export const chatApi = {
  async sendMessage(avatarId: number, content: string, deviceToken?: string): Promise<{ reply: string }> {
    const token = getAuthToken() || await getPairingToken();
    return request('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ avatar_id: avatarId, content, device_token: deviceToken }),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  },

  async getHistory(avatarId: number, limit?: number): Promise<{ messages: any[] }> {
    const token = getAuthToken() || await getPairingToken();
    return request(`/chat/history/${avatarId}${limit ? `?limit=${limit}` : ''}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  },

  sendCreatorReply: (avatarId: number, content: string) =>
    request<{ message: string }>('/chat/creator-reply', {
      method: 'POST',
      body: JSON.stringify({ avatar_id: avatarId, content }),
    }),
};

export const memoryApi = {
  getList: (avatarId: number) =>
    request<{ memories: any[] }>(`/avatars/${avatarId}/memories`),

  create: (avatarId: number, data: { key: string; content: string }) =>
    request<{ memory: any }>(`/avatars/${avatarId}/memories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (avatarId: number, memoryId: number, data: { key?: string; content?: string }) =>
    request<{ memory: any }>(`/avatars/${avatarId}/memories/${memoryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (avatarId: number, memoryId: number) =>
    request<{ success: boolean }>(`/avatars/${avatarId}/memories/${memoryId}`, {
      method: 'DELETE',
    }),
};

export const unknownApi = {
  getList: (answered = false) =>
    request<{ queries: any[] }>(`/unknown-queries?answered=${answered}`),

  respond: (id: number, answer: string) =>
    request<{ message: string }>(`/unknown-queries/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    }),
};
