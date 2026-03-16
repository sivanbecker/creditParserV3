import express from 'express';
import { authRouter } from './auth/authRoutes.js';
import { authMiddleware } from './auth/authMiddleware.js';

export const app = express();

app.use(express.json());

app.use('/auth', authRouter);

app.get('/me', authMiddleware, (req, res) => {
  if (!req.user) {
    return res.status(500).json({ error: 'User not set on request' });
  }

  return res.json({ user: req.user });
});

