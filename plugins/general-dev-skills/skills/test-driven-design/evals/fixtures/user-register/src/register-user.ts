import { hash } from 'bcryptjs';
import { z } from 'zod';
import type { Analytics } from './analytics';
import type { AuditLog } from './audit-log';
import type { Logger } from './logger';
import type { UserRepository } from './user-repository';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
  displayName: z.string().min(1).max(40),
});

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
};

export type RegisterResult =
  | { ok: true; user: PublicUser }
  | { ok: false; error: 'invalid_input'; issues: string[] }
  | { ok: false; error: 'email_taken' };

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export const toPublicUser = (u: {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: Date;
}): PublicUser => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  createdAt: u.createdAt,
});

export const registerUser = async (
  deps: {
    users: UserRepository;
    audit: AuditLog;
    analytics: Analytics;
    logger: Logger;
    newId: () => string;
    now: () => Date;
  },
  raw: unknown,
): Promise<RegisterResult> => {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    deps.logger.info('register.invalid_input', {
      issues: parsed.error.issues.length,
    });
    return {
      ok: false,
      error: 'invalid_input',
      issues: parsed.error.issues.map((i) => i.path.join('.')),
    };
  }

  const email = normalizeEmail(parsed.data.email);
  if (await deps.users.existsByEmail(email)) {
    deps.logger.info('register.email_taken', { email });
    return { ok: false, error: 'email_taken' };
  }

  const user = {
    id: deps.newId(),
    email,
    displayName: parsed.data.displayName,
    passwordHash: await hash(parsed.data.password, 10),
    createdAt: deps.now(),
  };
  await deps.users.insert(user);
  await deps.audit.record({
    action: 'user.registered',
    actorId: user.id,
    at: user.createdAt,
  });
  deps.analytics.track('user_registered', { userId: user.id });
  deps.logger.info('register.done', { userId: user.id });

  return { ok: true, user: toPublicUser(user) };
};
