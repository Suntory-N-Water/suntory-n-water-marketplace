export type Logger = {
  debug: (event: string, fields?: Record<string, unknown>) => void;
  info: (event: string, fields?: Record<string, unknown>) => void;
  warn: (event: string, fields?: Record<string, unknown>) => void;
  error: (event: string, fields?: Record<string, unknown>) => void;
};

export const consoleLogger: Logger = {
  debug: (event, fields) =>
    console.debug(JSON.stringify({ level: 'debug', event, ...fields })),
  info: (event, fields) =>
    console.info(JSON.stringify({ level: 'info', event, ...fields })),
  warn: (event, fields) =>
    console.warn(JSON.stringify({ level: 'warn', event, ...fields })),
  error: (event, fields) =>
    console.error(JSON.stringify({ level: 'error', event, ...fields })),
};
