export type Analytics = {
  track: (event: string, props?: Record<string, unknown>) => void;
};
