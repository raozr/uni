import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initializeDatabase } from './db';
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

async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, HOST, () => {
  console.log(`Uni server running on http://${HOST}:${PORT}`);
});
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export default app;
