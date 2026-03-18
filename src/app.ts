import express from 'express';
import { authRouter } from './auth/authRoutes.js';
import { authMiddleware } from './auth/authMiddleware.js';
import { adminMiddleware } from './admin/adminMiddleware.js';
import { adminRouter } from './admin/adminRoutes.js';

export const app = express();

app.use(express.json());

app.use('/auth', authRouter);

app.use('/admin', authMiddleware, adminMiddleware, adminRouter);

app.get('/me', authMiddleware, (req, res) => {
  if (!req.user) {
    return res.status(500).json({ error: 'User not set on request' });
  }

  return res.json({ user: req.user });
});
