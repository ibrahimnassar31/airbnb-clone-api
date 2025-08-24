import { StatusCodes } from 'http-status-codes';

export function requireRole(...allowed) {
  return (req, _res, next) => {
    const role = req.user?.role;
    if (!role || !allowed.includes(role)) {
      const err = new Error('You are a guest. Only hosts and admins can create listings. Guests can only book listings.');
      err.status = StatusCodes.FORBIDDEN;
      return next(err);
    }
    next();
  };
}

export default { requireRole };
