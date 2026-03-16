import type { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import { prisma } from '../lib/prisma.js';
import { registerSchema, loginSchema } from './authSchemas.js';
import { signAccessToken } from './jwt.js';

export const handleRegister = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const { email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const createdUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return res.status(201).json(createdUser);
  } catch (error) {
    return next(error);
  }
};

export const handleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signAccessToken(user);

    return res.status(200).json({ token });
  } catch (error) {
    return next(error);
  }
};

