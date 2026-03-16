export const placeholder = true;

import 'dotenv/config';

// Temporary bootstrap entry point.
// Later phases will wire API server and CLI here.
const main = () => {
  // No-op for now; just prove that build/start work.
  if (!process.env.DATABASE_URL) {
    // eslint-disable-next-line no-console
    console.warn('DATABASE_URL is not set. Configure .env before running the app.');
  }
};

main();

import express from 'express';
import { config } from './config';
import authRoutes from './routes/auth';
import { authMiddleware } from './middleware/auth';

const app = express();
app.use(express.json());

app.use('/auth', authRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', authMiddleware, (_, res) => {
  res.json({ message: 'Protected API placeholder' });
});

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
