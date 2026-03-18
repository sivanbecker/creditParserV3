import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../lib/prisma', () => {
  return {
    prisma: {
      user: {},
    },
  };
});

// Import app after mocking Prisma to avoid initializing a real client.
import { app } from '../app.js';

describe('auth middleware /me route', () => {
  const secret = 'test-secret';

  beforeAll(() => {
    process.env.JWT_SECRET = secret;
  });

  it('returns 200 and user payload with valid token', async () => {
    const token = jwt.sign(
      {
        sub: 'user-1',
        email: 'user@example.com',
      },
      secret,
      { expiresIn: '24h' },
    );

    const response = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      user: {
        id: 'user-1',
        email: 'user@example.com',
      },
    });
  });

  it('returns 401 when Authorization header is missing', async () => {
    const response = await request(app).get('/me').expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('returns 401 when token is invalid', async () => {
    const response = await request(app)
      .get('/me')
      .set('Authorization', 'Bearer invalid.token.value')
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});
