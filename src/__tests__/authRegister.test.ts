import request from 'supertest';
import { app } from '../app.js';

jest.mock('../lib/prisma', () => {
  const users: any[] = [];

  return {
    prisma: {
      user: {
        deleteMany: jest.fn(async () => {
          const count = users.length;
          users.length = 0;
          return { count };
        }),
        create: jest.fn(async ({ data }: any) => {
          const user = {
            id: String(users.length + 1),
            email: data.email,
            createdAt: new Date(),
          };

          users.push(user);
          return user;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          return users.find((user) => user.email === where.email) ?? null;
        }),
      },
    },
  };
});

describe('POST /auth/register', () => {
  beforeEach(async () => {
    // Reset handled by mocked deleteMany to keep semantics close to real Prisma.
    const { prisma } = await import('../lib/prisma.js');
    await prisma.user.deleteMany();
  });

  it('creates a new user and returns safe payload', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'user@example.com',
        password: 'this is a long random passphrase 2026',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toMatchObject({
      email: 'user@example.com',
    });
    expect(response.body).not.toHaveProperty('passwordHash');

    // Creation behavior is verified indirectly via the HTTP response and mocked Prisma.
  });

  it('rejects duplicate email with 409 conflict', async () => {
    const { prisma } = await import('../lib/prisma.js');
    await prisma.user.create({
      data: { email: 'duplicate@example.com', passwordHash: 'hash' },
    });

    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'duplicate@example.com',
        password: 'this is a long random passphrase 2026',
      })
      .expect(409);

    expect(response.body).toHaveProperty('error');
  });

  it('validates email format and password strength', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'not-an-email',
        password: 'short',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('details');
  });
});
