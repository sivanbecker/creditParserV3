import jwt from 'jsonwebtoken';

export type AuthTokenPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

const JWT_EXPIRY = '24h';

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }

  return process.env.JWT_SECRET;
};

export const signAccessToken = (user: { id: string; email: string }) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    getJwtSecret(),
    {
      expiresIn: JWT_EXPIRY,
    },
  );
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
};

