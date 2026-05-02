export type TwoFactorSetupResult = {
  secret: string;
  otpauthUrl: string;
};

export type VerifyTotpOptions = {
  stepSec?: number;
  window?: number;
  atMs?: number;
};

