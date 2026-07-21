import { generatePairingCode } from '../routes/avatar';

describe('avatar pairing code generation', () => {
  it('应生成 6 位字符串', () => {
    const code = generatePairingCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(code.length).toBe(6);
  });

  it('应支持前导零（如 000123）', () => {
    let foundLeadingZero = false;
    for (let i = 0; i < 5000; i++) {
      const code = generatePairingCode();
      expect(code.length).toBe(6);
      if (code.startsWith('0')) {
        foundLeadingZero = true;
        break;
      }
    }
    expect(foundLeadingZero).toBe(true);
  });

  it('生成的码应在合法范围内（000000-999999）', () => {
    for (let i = 0; i < 100; i++) {
      const code = generatePairingCode();
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it('应能生成不重复的码（随机性）', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generatePairingCode());
    }
    expect(codes.size).toBeGreaterThan(900);
  });
});
