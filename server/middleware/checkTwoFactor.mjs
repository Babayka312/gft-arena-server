export function createCheckTwoFactor() {
  return function checkTwoFactor(req, res, next) {
    if (req.adminAuth?.twoFactorVerified === true) return next();
    return res.status(401).json({ error: '2FA required' });
  };
}

