import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../lib/prisma', () => {
  const users: any[] = [];

  return {
    prisma: {
      user: {
        findMany: jest.fn(async (args?: any) => {
          const select = args?.select;

          if (!select) {
            return users;
          }

          return users.map((user) => {
            const result: any = {};

            for (const key of Object.keys(select)) {
              if (select[key]) {
                result[key] = (user as any)[key];
              }
            }

            return result;
          });
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          return users.find((user) => user.email === where.email) ?? null;
        }),
        create: jest.fn(async ({ data, select }: any) => {
          const created = {
            id: `user-${users.length + 1}`,
            email: data.email,
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            isAdmin: data.isAdmin ?? false,
            isActive: true,
          };

          users.push({
            ...created,
            passwordHash: data.passwordHash,
          });

          if (!select) {
            return created;
          }

          const result: any = {};

          for (const key of Object.keys(select)) {
            if (select[key]) {
              result[key] = (created as any)[key];
            }
          }

          return result;
        }),
        update: jest.fn(async ({ where, data, select }: any) => {
          const index = users.findIndex((user) => user.id === where.id);

          if (index === -1) {
            const error: any = new Error('Record to update not found');
            error.code = 'P2025';
            throw error;
          }

          users[index] = {
            ...users[index],
            ...data,
          };

          const updated = users[index];

          if (!select) {
            return updated;
          }

          const result: any = {};

          for (const key of Object.keys(select)) {
            if (select[key]) {
              result[key] = (updated as any)[key];
            }
          }

          return result;
        }),
      },
    },
    __resetUsers: () => {
      users.length = 0;
    },
    __getUsers: () => users,
  };
});

// Import app after mocking Prisma to avoid initializing a real client.
import { app } from '../app.js';

const createToken = (payload: { sub: string; email: string; isAdmin: boolean }) => {
  const secret = process.env.JWT_SECRET as string;

  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      isAdmin: payload.isAdmin,
    },
    secret,
    { expiresIn: '24h' },
  );
};

describe('Admin API /admin/users', () => {
  const prismaModule = jest.requireMock('../lib/prisma') as any;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  beforeEach(() => {
    prismaModule.__resetUsers();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const response = await request(app).get('/admin/users').expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('returns 403 for non-admin user', async () => {
    const token = createToken({
      sub: 'user-1',
      email: 'user@example.com',
      isAdmin: false,
    });

    const response = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body).toHaveProperty(
      'error',
      'Forbidden: admin access required',
    );
  });

  it('allows admin user to list users', async () => {
    const token = createToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      isAdmin: true,
    });

    const users = prismaModule.__getUsers();
    users.push({
      id: 'user-1',
      email: 'user1@example.com',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      isAdmin: false,
      isActive: true,
      passwordHash: 'hash',
    });

    const response = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: 'user-1',
      email: 'user1@example.com',
      isAdmin: false,
    });
    expect(response.body[0]).not.toHaveProperty('passwordHash');
  });

  it('creates a new user via POST /admin/users', async () => {
    const token = createToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      isAdmin: true,
    });

    const response = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'newuser@example.com',
        password: 'this is a long random passphrase 2026',
        isAdmin: true,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      email: 'newuser@example.com',
      isAdmin: true,
    });
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('returns 409 when creating a user with existing email', async () => {
    const token = createToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      isAdmin: true,
    });

    const users = prismaModule.__getUsers();
    users.push({
      id: 'user-1',
      email: 'existing@example.com',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      isAdmin: false,
      isActive: true,
      passwordHash: 'hash',
    });

    const response = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'existing@example.com',
        password: 'this is a long random passphrase 2026',
      })
      .expect(409);

    expect(response.body).toHaveProperty(
      'error',
      'Email is already registered',
    );
  });

  it('returns 400 for invalid POST /admin/users body', async () => {
    const token = createToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      isAdmin: true,
    });

    const response = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'not-an-email',
        password: 'short',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Invalid request body');
    expect(response.body).toHaveProperty('details');
  });

  it('updates user via PATCH /admin/users/:id', async () => {
    const token = createToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      isAdmin: true,
    });

    const users = prismaModule.__getUsers();
    users.push({
      id: 'user-1',
      email: 'user1@example.com',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      isAdmin: false,
      isActive: true,
      passwordHash: 'hash',
    });

    const response = await request(app)
      .patch('/admin/users/user-1')
      .set('Authorization', `Bearer ${token}`)
      .send({
        isAdmin: true,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: 'user-1',
      email: 'user1@example.com',
      isAdmin: true,
    });
  });

  it('returns 404 when updating non-existing user', async () => {
    const token = createToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      isAdmin: true,
    });

    const response = await request(app)
      .patch('/admin/users/missing-id')
      .set('Authorization', `Bearer ${token}`)
      .send({
        isAdmin: true,
      })
      .expect(404);

    expect(response.body).toHaveProperty('error', 'User not found');
  });

  it('returns 400 for invalid PATCH /admin/users/:id body', async () => {
    const token = createToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      isAdmin: true,
    });

    const response = await request(app)
      .patch('/admin/users/user-1')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Invalid request body');
    expect(response.body).toHaveProperty('details');
  });
});

