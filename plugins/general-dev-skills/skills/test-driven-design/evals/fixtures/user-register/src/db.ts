export type Sql = <T = unknown>(
  query: string,
  params?: unknown[],
) => Promise<T[]>;
