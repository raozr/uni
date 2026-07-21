import { DEEPSEEK_API_KEY, DEEPSEEK_API_URL } from '../config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function askDeepSeek(
  systemPrompt: string,
  history: { role: string; content: string }[],
  userMessage: string
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
      content: m.role === 'creator' ? `[创建者]: ${m.content}` : m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content || '抱歉，我没有理解你的问题。';
  } finally {
    clearTimeout(timeout);
  }
}
