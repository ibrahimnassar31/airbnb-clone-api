import 'dotenv/config';

function get(name, def, required = false) {
  const val = process.env[name] ?? def;
  if (required && (val === undefined || val === '')) {
    throw new Error(`Missing env ${name}`);
  }
  return val;
}

export const env = {
  nodeEnv: get('NODE_ENV', 'development'),
  isProd: process.env.NODE_ENV === 'production',
  port: Number(get('PORT', '3000')),
  mongoUri: get('MONGO_URI', 'mongodb://127.0.0.1:27017/airbnb_clone', true),

  jwt: {
    accessSecret: get('JWT_ACCESS_SECRET', 'ibrahim2003', true),
    refreshSecret: get('JWT_REFRESH_SECRET', 'ibrahim2003', true),
    accessExpires: get('JWT_ACCESS_EXPIRES', '15m'),
    refreshExpires: get('JWT_REFRESH_EXPIRES', '7d'),
  },

  rateLimit: {
    windowMin: Number(get('RATE_LIMIT_WINDOW_MIN', '15')),
    max: Number(get('RATE_LIMIT_MAX', '100')),
  },

  corsOrigins: get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map(s => s.trim()),

  logDir: get('LOG_DIR', 'logs'),
  
  appOrigin: get('APP_ORIGIN', `http://localhost:${get('PORT', '3000')}`),
  mailFrom: get('MAIL_FROM', 'no-reply@airbnb-clone.local'),
  smtp: {
    host: get('SMTP_HOST', ''),
    port: get('SMTP_PORT', ''),
    user: get('SMTP_USER', ''),
    pass: get('SMTP_PASS', ''),
  },
};
