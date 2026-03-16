import { Router } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import { prisma } from '../lib/prisma.js';
import { passwordSchema } from '../auth/passwordValidation.js';

const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  isAdmin: z.boolean().optional().default(false),
});

const adminUpdateUserSchema = z
  .object({
    isAdmin: z.boolean().optional(),
  })
  .refine((data) => typeof data.isAdmin === 'boolean', {
    message: 'At least one of isAdmin must be provided',
    path: ['isAdmin'],
  });

export const adminRouter = Router();

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
        isAdmin: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return res.status(200).json(users);
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/users', async (req, res, next) => {
  try {
    const parsed = adminCreateUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const { email, password, isAdmin } = parsed.data;

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
        isAdmin,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        isAdmin: true,
      },
    });

    return res.status(201).json(createdUser);
  } catch (error) {
    return next(error);
  }
});

adminRouter.patch('/users/:id', async (req, res, next) => {
  try {
    const parsed = adminUpdateUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const { isAdmin } = parsed.data;

    const data: { isAdmin?: boolean } = {};

    if (typeof isAdmin === 'boolean') {
      data.isAdmin = isAdmin;
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: req.params.id },
        data,
        select: {
          id: true,
          email: true,
          createdAt: true,
          isAdmin: true,
        },
      });

      return res.status(200).json(updatedUser);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'User not found' });
      }

      throw error;
    }
  } catch (error) {
    return next(error);
  }
});

