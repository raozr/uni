import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initializeDatabase } from './db';
import getPool from './db';
import { CORS_ORIGINS } from './config';
import authRoutes from './routes/auth';
import avatarRoutes from './routes/avatar';
import chatRoutes from './routes/chat';
import pairingRoutes from './routes/pairing';
import unknownRoutes from './routes/unknown';
import avatarMemoriesRouter from './routes/avatar-memories';

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '3000', 10);

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
}));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/avatars', avatarRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/pairing', pairingRoutes);
app.use('/api/unknown-queries', unknownRoutes);
app.use('/api/avatars', avatarMemoriesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: '服务器内部错误' });
});

async function start() {
  try {
    await initializeDatabase();
    const server = app.listen(PORT, HOST, () => {
      console.log(`Uni server running on http://${HOST}:${PORT}`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      console.error('Server error:', err.message);
      process.exit(1);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      server.close(async () => {
        try {
          await getPool().end();
          console.log('Database pool closed');
        } catch (e) {
          console.error('Error closing pool:', e);
        }
        process.exit(0);
      });

      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

start();

export default app;
