import { Request, Response, NextFunction } from 'express';

describe('rateLimiter middleware', () => {
  let rateLimiter: (windowMs?: number, maxRequests?: number) => any;

  beforeEach(() => {
    jest.resetModules();
    rateLimiter = require('../middleware/rateLimiter').rateLimiter;
  });

  function mockReq(path: string, ip = '127.0.0.1'): Request {
    return { path, ip, headers: {} } as unknown as Request;
  }

  function mockRes(): Response {
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    return res;
  }

  function mockNext(): NextFunction {
    return jest.fn() as unknown as NextFunction;
  }

  it('应在限流内允许请求通过', () => {
    const limiter = rateLimiter(60000, 5);
    const req = mockReq('/api/test');
    const res = mockRes();
    const next = mockNext();
    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('应在超过限流阈值时返回 429', () => {
    const limiter = rateLimiter(60000, 3);
    const req = mockReq('/api/blocked');
    const res = mockRes();
    const next = mockNext();

    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Too many') })
    );
  });

  it('不同 IP 应分别限流', () => {
    const limiter = rateLimiter(60000, 1);
    const res = mockRes();
    const next = mockNext();

    limiter(mockReq('/api/a', '1.1.1.1'), res, next);
    limiter(mockReq('/api/a', '2.2.2.2'), res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('不同路径应分别限流', () => {
    const limiter = rateLimiter(60000, 1);
    const res = mockRes();
    const next = mockNext();

    limiter(mockReq('/api/path1'), res, next);
    limiter(mockReq('/api/path2'), res, next);

    expect(next).toHaveBeenCalledTimes(2);
  });
});
