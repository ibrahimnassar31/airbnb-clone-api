
import { StatusCodes } from 'http-status-codes';
import xss from 'xss';
export function validate(schema, property = 'body') {
  return (req, _res, next) => {
    try {
      let input = req[property];
      const sanitize = (obj) => {
        if (typeof obj === 'string') return xss(obj);
        if (Array.isArray(obj)) return obj.map(sanitize);
        if (obj && typeof obj === 'object') {
          for (const k in obj) obj[k] = sanitize(obj[k]);
        }
        return obj;
      };
      input = sanitize(input);
      const result = schema.parse(input);
      req[property] = result; 
      next();
    } catch (e) {
      const errs = e?.issues ?? e?.errors ?? [];
      const issues = Array.isArray(errs) ? errs.map(er => ({ path: Array.isArray(er.path) ? er.path.join('.') : String(er.path ?? ''), message: er.message })) : [];
      const err = new Error('Validation failed');
      err.status = StatusCodes.UNPROCESSABLE_ENTITY;
      err.details = issues;
      next(err);
    }
  };
}

export default { validate };
