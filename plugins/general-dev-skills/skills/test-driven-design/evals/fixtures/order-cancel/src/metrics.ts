export type Metrics = {
  increment: (name: string, tags?: Record<string, string>) => void;
  histogram: (name: string, value: number) => void;
};
