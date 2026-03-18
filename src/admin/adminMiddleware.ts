import type { Request, Response, NextFunction } from 'express';

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden: admin access required' });
  }

  return next();
};
