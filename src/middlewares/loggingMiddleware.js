import morgan from 'morgan';
import requestId from 'express-request-id';
import logger from '../utils/logger.js';

export function requestIdMiddleware() {
  return requestId({ setHeader: true }); 
}

morgan.token('id', (req) => req.id);
const mFormat = ':id :method :url :status :res[content-length] - :response-time ms :remote-addr :user-agent';

export function morganMiddleware() {
  return morgan(mFormat, {
    stream: { write: (msg) => logger.http(msg.trim()) },
  });
}

export function attachLogger() {
  return (req, _res, next) => {
    req.log = logger.child({ requestId: req.id });
    next();
  };
}

export default { requestIdMiddleware, morganMiddleware, attachLogger };
