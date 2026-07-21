import { isUncertainReply, matchPresetAnswer } from '../services/chat';

describe('chat service - isUncertainReply', () => {
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
});

describe('chat service - matchPresetAnswer（多数匹配逻辑）', () => {
  const presets = [
    { keywords: '天气,下雨', answer: '记得带伞' },
    { keywords: '吃饭,午饭,晚饭', answer: '按时吃饭' },
  ];

  it('单关键词命中即可匹配（1个关键词，多数=1）', () => {
    expect(matchPresetAnswer('今天天气怎么样', presets)).toBe('记得带伞');
    expect(matchPresetAnswer('外面下雨了', presets)).toBe('记得带伞');
  });

  it('多关键词需命中过半才匹配（3个关键词，多数=2）', () => {
    expect(matchPresetAnswer('吃午饭了吗', presets)).toBeNull();
    expect(matchPresetAnswer('吃晚饭了吗', presets)).toBeNull();
    expect(matchPresetAnswer('吃饭', presets)).toBeNull();
    expect(matchPresetAnswer('吃午饭晚饭', presets)).toBe('按时吃饭');
    expect(matchPresetAnswer('吃午饭晚饭了吗', presets)).toBe('按时吃饭');
  });

  it('无匹配时返回 null', () => {
    expect(matchPresetAnswer('今天心情好吗', presets)).toBeNull();
  });

  it('空 keywords 命中所有内容（真实代码行为）', () => {
    const emptyPresets = [
      { keywords: '', answer: '空关键词' },
      { keywords: '你好', answer: '你好呀' },
    ];
    expect(matchPresetAnswer('你好', emptyPresets)).toBe('空关键词');
    expect(matchPresetAnswer('天气', emptyPresets)).toBe('空关键词');
  });
});
