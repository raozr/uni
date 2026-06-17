describe('config module', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('应在 JWT_SECRET 未设置时抛出错误', () => {
    delete process.env.JWT_SECRET;
    expect(() => require('../config')).toThrow(/JWT_SECRET/);
  });

  it('应在 JWT_SECRET 长度不足 16 位时抛出错误', () => {
    process.env.JWT_SECRET = 'short';
    expect(() => require('../config')).toThrow(/JWT_SECRET/);
  });

  it('应在 JWT_SECRET 合法时正常导出', () => {
    process.env.JWT_SECRET = 'a-valid-secret-key-1234567890';
    const config = require('../config');
    expect(config.JWT_SECRET).toBe('a-valid-secret-key-1234567890');
    expect(Array.isArray(config.CORS_ORIGINS)).toBe(true);
  });

  it('应正确解析 CORS_ORIGINS 逗号分隔列表', () => {
    process.env.JWT_SECRET = 'a-valid-secret-key-1234567890';
    process.env.CORS_ORIGINS = 'http://localhost:8081,https://example.com , ';
    const config = require('../config');
    expect(config.CORS_ORIGINS).toEqual(['http://localhost:8081', 'https://example.com']);
  });

  it('应在 CORS_ORIGINS 未设置时返回空数组', () => {
    process.env.JWT_SECRET = 'a-valid-secret-key-1234567890';
    delete process.env.CORS_ORIGINS;
    const config = require('../config');
    expect(config.CORS_ORIGINS).toEqual([]);
  });
});
