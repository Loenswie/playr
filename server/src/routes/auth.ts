import { Router } from 'express';
import { z } from 'zod';
import { clearSession, issueSession, requireAuth } from '../middleware/auth.js';
import { HttpError, route } from '../middleware/errors.js';
import { authLimiter } from '../middleware/rateLimit.js';
import {
  EmailTakenError,
  UsernameTakenError,
  createUser,
  findUserById,
  verifyCredentials,
} from '../services/users.js';

const registerSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(255),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters.')
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores.'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters.')
    .max(200, 'Password must be at most 200 characters.'),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  route(async (req, res) => {
    const { email, username, password } = registerSchema.parse(req.body);
    try {
      const user = await createUser(email, username, password);
      issueSession(res, user.id);
      res.status(201).json({ user });
    } catch (error) {
      if (error instanceof EmailTakenError) {
        throw new HttpError(409, 'That email is already registered.');
      }
      if (error instanceof UsernameTakenError) {
        throw new HttpError(409, 'That username is already taken.');
      }
      throw error;
    }
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  route(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await verifyCredentials(email, password);
    // Deliberately vague: do not reveal whether the email exists.
    if (!user) throw new HttpError(401, 'Incorrect email or password.');
    issueSession(res, user.id);
    res.json({ user });
  }),
);

authRouter.post('/logout', (_req, res) => {
  clearSession(res);
  res.status(204).end();
});

authRouter.get(
  '/me',
  requireAuth,
  route(async (req, res) => {
    const user = await findUserById(req.userId!);
    if (!user) {
      // The session points at a deleted account.
      clearSession(res);
      throw new HttpError(401, 'Authentication required.');
    }
    res.json({ user });
  }),
);
