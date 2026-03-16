import { Router } from 'express';
import { handleLogin, handleRegister } from './authController.js';

export const authRouter = Router();

authRouter.post('/register', handleRegister);
authRouter.post('/login', handleLogin);

