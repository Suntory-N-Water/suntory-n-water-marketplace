import type { Sql } from './db';

export type AuditLog = {
  record: (entry: {
    action: string;
    actorId: string;
    at: Date;
  }) => Promise<void>;
};

export const createAuditLog = (sql: Sql): AuditLog => ({
  record: async ({ action, actorId, at }) => {
    await sql(
      'insert into audit_logs (action, actor_id, at) values ($1, $2, $3)',
      [action, actorId, at],
    );
  },
});
