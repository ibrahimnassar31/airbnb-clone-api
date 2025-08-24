import xss from 'xss';

export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') out[k] = xss(v);
    else if (v && typeof v === 'object') out[k] = sanitizeObject(v);
    else out[k] = v;
  }
  return out;
}

export function sanitizeBody() {
  return (req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    next();
  };
}

export default { sanitizeBody, sanitizeObject };
