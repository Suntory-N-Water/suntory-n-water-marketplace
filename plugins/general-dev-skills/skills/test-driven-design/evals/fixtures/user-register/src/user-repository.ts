import type { Sql } from './db';

export type StoredUser = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: Date;
};

export type UserRepository = {
  existsByEmail: (email: string) => Promise<boolean>;
  insert: (user: StoredUser) => Promise<void>;
};

export const createUserRepository = (sql: Sql): UserRepository => ({
  existsByEmail: async (email) => {
    const rows = await sql<{ n: number }>(
      'select count(*)::int as n from users where email = $1',
      [email],
    );
    return (rows[0]?.n ?? 0) > 0;
  },
  insert: async (u) => {
    await sql(
      'insert into users (id, email, display_name, password_hash, created_at) values ($1, $2, $3, $4, $5)',
      [u.id, u.email, u.displayName, u.passwordHash, u.createdAt],
    );
  },
});
