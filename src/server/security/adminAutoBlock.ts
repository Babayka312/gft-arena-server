export type AdminBlockState = {
  blockedUntil: number;
  reasons: Array<{ at: string; reason: string }>;
};

