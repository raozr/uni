import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await getPool().query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('Executed query', { text: text.slice(0, 80), duration, rows: res.rowCount });
  }
  return res;
}

export async function withTransaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS avatars (
      id SERIAL PRIMARY KEY,
      creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      target_name VARCHAR(100) NOT NULL,
      persona TEXT DEFAULT '',
      ai_tone VARCHAR(500) DEFAULT '语气亲切、温柔，像家人一样聊天',
      pairing_code VARCHAR(6) UNIQUE NOT NULL,
      age INTEGER,
      occupation VARCHAR(100),
      relationship VARCHAR(50),
      personality_traits JSONB,
      interests JSONB,
      dialogue_preferences JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`ALTER TABLE avatars ADD COLUMN IF NOT EXISTS age INTEGER`);
  await query(`ALTER TABLE avatars ADD COLUMN IF NOT EXISTS occupation VARCHAR(100)`);
  await query(`ALTER TABLE avatars ADD COLUMN IF NOT EXISTS relationship VARCHAR(50)`);
  await query(`ALTER TABLE avatars ADD COLUMN IF NOT EXISTS personality_traits JSONB`);
  await query(`ALTER TABLE avatars ADD COLUMN IF NOT EXISTS interests JSONB`);
  await query(`ALTER TABLE avatars ADD COLUMN IF NOT EXISTS dialogue_preferences JSONB`);

  await query(`
    CREATE TABLE IF NOT EXISTS preset_answers (
      id SERIAL PRIMARY KEY,
      avatar_id INTEGER NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
      keywords VARCHAR(500) NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      avatar_id INTEGER NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'ai', 'creator')),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS unknown_queries (
      id SERIAL PRIMARY KEY,
      avatar_id INTEGER NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      notified BOOLEAN DEFAULT FALSE,
      answered BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS avatar_memories (
      id SERIAL PRIMARY KEY,
      avatar_id INTEGER NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
      key VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      source VARCHAR(20) NOT NULL DEFAULT 'manual',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_avatars_creator ON avatars(creator_id);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_avatar_created
      ON chat_messages(avatar_id, created_at DESC);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_preset_answers_avatar ON preset_answers(avatar_id);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_unknown_queries_avatar_answered
      ON unknown_queries(avatar_id, answered);
  `);

  await query(`DROP INDEX IF EXISTS idx_avatars_pairing_code;`);
  await query(`DROP INDEX IF EXISTS idx_avatar_memories_avatar_id;`);
  await query(`DROP INDEX IF EXISTS idx_avatar_memories_avatar_id_key;`);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_avatar_memories_avatar_id_key ON avatar_memories(avatar_id, key);
  `);

  console.log('Database initialized successfully');
}

export default getPool;
