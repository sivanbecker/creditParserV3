import type { Request } from 'express';

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      email: string;
      isAdmin: boolean;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
