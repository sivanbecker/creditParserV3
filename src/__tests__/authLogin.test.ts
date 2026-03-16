import request from 'supertest';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { app } from '../app.js';

jest.mock('../lib/prisma', () => {
  const users: any[] = [];

  return {
    prisma: {
      user: {
        findUnique: jest.fn(async ({ where }: any) => {
          return users.find((user) => user.email === where.email) ?? null;
        }),
      },
    },
    __setUsers: (newUsers: any[]) => {
      users.length = 0;
      users.push(...newUsers);
    },
  };
});

describe('POST /auth/login', () => {
  const prismaModule = jest.requireMock('../lib/prisma') as any;
  let passwordHash: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    passwordHash = await argon2.hash('correct-password', {
      type: argon2.argon2id,
    });
  });

  beforeEach(() => {
    prismaModule.__setUsers([]);
  });

  it('returns a JWT token for valid credentials', async () => {
    prismaModule.__setUsers([
      {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash,
      },
    ]);

    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: 'correct-password',
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');

    const decoded = jwt.verify(
      response.body.token,
      process.env.JWT_SECRET as string,
    ) as jwt.JwtPayload;

    expect(decoded.sub).toBe('user-1');
    expect(decoded.email).toBe('user@example.com');
  });

  it('returns 401 for non-existing user', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'missing@example.com',
        password: 'whatever-password',
      })
      .expect(401);

    expect(response.body).toHaveProperty('error', 'Invalid credentials');
  });

  it('returns 401 for invalid password', async () => {
    prismaModule.__setUsers([
      {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash,
      },
    ]);

    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: 'wrong-password',
      })
      .expect(401);

    expect(response.body).toHaveProperty('error', 'Invalid credentials');
  });

  it('returns 400 for invalid request body', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'not-an-email',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('details');
  });
});

