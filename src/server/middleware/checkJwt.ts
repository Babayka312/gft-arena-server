export type AdminJwtPayload = {
  sub: string;
  role: 'admin';
  twoFactorVerified: boolean;
  stage?: 'pre2fa' | 'full';
  iss: string;
  iat: number;
  exp: number;
};

