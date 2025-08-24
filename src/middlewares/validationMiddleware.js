import { StatusCodes } from 'http-status-codes';

export function validate(schema, property = 'body') {
  return (req, _res, next) => {
    try {
      const result = schema.parse(req[property]);
      req[property] = result; // parsed & coerced
      next();
    } catch (e) {
      const issues = e.errors?.map(er => ({ path: er.path?.join('.'), message: er.message })) ?? [];
      const err = new Error('Validation failed');
      err.status = StatusCodes.UNPROCESSABLE_ENTITY;
      err.details = issues;
      next(err);
    }
  };
}

export default { validate };
