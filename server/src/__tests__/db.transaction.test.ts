describe('db withTransaction', () => {
  function createMockClient() {
    const calls: string[] = [];
    const client = {
      query: jest.fn(async (text: string) => {
        calls.push(text);
        return { rows: [] };
      }),
      release: jest.fn(),
      _calls: calls,
    };
    return client;
  }

  function createWithTransaction(client: any) {
    const pool = { connect: jest.fn().mockResolvedValue(client) };
    jest.resetModules();
    jest.doMock('../db', () => ({
      __esModule: true,
      getPool: () => pool,
      query: jest.fn(),
      withTransaction: async (fn: (c: any) => Promise<any>) => {
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          const result = await fn(c);
          await c.query('COMMIT');
          return result;
        } catch (err) {
          await c.query('ROLLBACK');
          throw err;
        } finally {
          c.release();
        }
      },
    }));
    return require('../db').withTransaction;
  }

  it('成功时应执行 BEGIN、COMMIT、release', async () => {
    const client = createMockClient();
    const withTransaction = createWithTransaction(client);

    await withTransaction(async (c: any) => {
      await c.query('INSERT INTO foo VALUES (1)');
      return 'ok';
    });

    expect(client._calls).toEqual(['BEGIN', 'INSERT INTO foo VALUES (1)', 'COMMIT']);
    expect(client.release).toHaveBeenCalled();
  });

  it('失败时应执行 ROLLBACK 并释放连接', async () => {
    const client = createMockClient();
    const withTransaction = createWithTransaction(client);

    await expect(
      withTransaction(async (c: any) => {
        await c.query('INSERT INTO foo VALUES (1)');
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(client._calls).toContain('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });
});
