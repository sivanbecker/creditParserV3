import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 100;

const PASSWORD_BLACKLIST = [
  'password',
  '123456',
  '123456789',
  'qwerty',
  'creditparserv3',
  'credit card expense tracker',
];

const basePasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
  })
  .max(PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters long`,
  });

export const passwordSchema = basePasswordSchema
  .transform((rawValue): string => rawValue.trim())
  .refine(
    (value: string) => {
      const normalized = value.toLowerCase();

      return !PASSWORD_BLACKLIST.some((blacklisted) => normalized === blacklisted.toLowerCase());
    },
    { message: 'Password is too common or insecure' },
  );

export const validatePassword = (password: string) => {
  return passwordSchema.safeParse(password);
};
