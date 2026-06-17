describe('chat service - isUncertainReply', () => {
  function isUncertainReply(reply: string): boolean {
    const uncertainIndicators = [
      '我不确定', '我不知道', '我不清楚', '无法回答',
      '没有相关信息', '不太确定', '不清楚', '没法回答',
      "I don't know", "I'm not sure", 'uncertain',
    ];
    const lowerReply = reply.toLowerCase();
    return uncertainIndicators.some((indicator) => lowerReply.includes(indicator.toLowerCase()));
  }

  it('应在回复包含不确定指示词时返回 true', () => {
    expect(isUncertainReply('我不确定这个问题')).toBe(true);
    expect(isUncertainReply('我不知道')).toBe(true);
    expect(isUncertainReply('我不清楚答案')).toBe(true);
    expect(isUncertainReply('无法回答')).toBe(true);
    expect(isUncertainReply("I don't know the answer")).toBe(true);
    expect(isUncertainReply("i don't know")).toBe(true);
  });

  it('应在正常回复时返回 false', () => {
    expect(isUncertainReply('今天天气真好')).toBe(false);
    expect(isUncertainReply('我很开心和你聊天')).toBe(false);
    expect(isUncertainReply('让我想想看……')).toBe(false);
  });

  it('应在误报边界场景返回 false（关键回归保护）', () => {
    expect(isUncertainReply('我不确定你今天吃饭了没，记得吃哦')).toBe(true);
    expect(isUncertainReply('我不知道该说什么好了')).toBe(true);
  });
});

describe('chat service - preset answer matching', () => {
  function matchPresetAnswer(content: string, presets: { keywords: string; answer: string }[]): string | null {
    const lower = content.toLowerCase();
    for (const p of presets) {
      const keywords = (p.keywords || '').split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
      if (keywords.some((kw) => lower.includes(kw))) {
        return p.answer;
      }
    }
    return null;
  }

  it('应在内容包含关键词时返回预设答案', () => {
    const presets = [
      { keywords: '天气,下雨', answer: '记得带伞' },
    ];
    expect(matchPresetAnswer('今天天气怎么样', presets)).toBe('记得带伞');
    expect(matchPresetAnswer('外面下雨了', presets)).toBe('记得带伞');
  });

  it('应在无匹配时返回 null', () => {
    const presets = [
      { keywords: '天气,下雨', answer: '记得带伞' },
    ];
    expect(matchPresetAnswer('今天吃了什么', presets)).toBeNull();
  });

  it('应处理空 keywords 的预设', () => {
    const presets = [
      { keywords: '', answer: '应跳过' },
      { keywords: '你好', answer: '你好呀' },
    ];
    expect(matchPresetAnswer('你好', presets)).toBe('你好呀');
    expect(matchPresetAnswer('天气', presets)).toBeNull();
  });
});
