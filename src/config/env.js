import 'dotenv/config';

function get(name, def, required = false) {
  const val = process.env[name] ?? def;
  if (required && (val === undefined || val === '')) {
    throw new Error(`Missing env ${name}`);
  }
  return val;
}

function parseBool(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

export const env = {
  nodeEnv: get('NODE_ENV', 'development'),
  isProd: process.env.NODE_ENV === 'production',
  port: Number(get('PORT', '3000')),
  mongoUri: get('MONGO_URI', 'mongodb://127.0.0.1:27017/airbnb_clone', true),

  jwt: {
    accessSecret: get('JWT_ACCESS_SECRET', 'dev-access-secret', process.env.NODE_ENV === 'production'),
    refreshSecret: get('JWT_REFRESH_SECRET', 'dev-refresh-secret', process.env.NODE_ENV === 'production'),
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
  corsAllowAll: parseBool(get('CORS_ALLOW_ALL', process.env.NODE_ENV === 'test' ? '1' : '0')),

  csp: {
    defaultSrc: get('CSP_DEFAULT_SRC', "'self'").split(',').map(s => s.trim()),
    scriptSrc: get('CSP_SCRIPT_SRC', "'self',https://cdn.example.com").split(',').map(s => s.trim()),
    imgSrc: get('CSP_IMG_SRC', "'self',https://cdn.example.com,https://uploads.example.com,data:").split(',').map(s => s.trim()),
    styleSrc: get('CSP_STYLE_SRC', "'self',https://cdn.example.com").split(',').map(s => s.trim()),
    connectSrc: get('CSP_CONNECT_SRC', "'self',https://api.example.com").split(',').map(s => s.trim()),
    objectSrc: get('CSP_OBJECT_SRC', "'none'").split(',').map(s => s.trim()),
    upgradeInsecureRequests: parseBool(get('CSP_UPGRADE_INSECURE', '')),
  },

  logDir: get('LOG_DIR', 'logs'),
  
  appOrigin: get('APP_ORIGIN', `http://localhost:${get('PORT', '3000')}`),
  mailFrom: get('MAIL_FROM', 'no-reply@airbnb-clone.local'),
  smtp: {
    host: get('SMTP_HOST', ''),
    port: get('SMTP_PORT', ''),
    user: get('SMTP_USER', ''),
    pass: get('SMTP_PASS', ''),
  },

  cache: {
    enabled: parseBool(get('CACHE_ENABLED', '1')),
    maxTtlSec: Number(get('CACHE_MAX_TTL_SEC', '120')),
  },

  // App metadata for health/info endpoints
  appVersion: get('APP_VERSION', ''),
  gitSha: get('GIT_SHA', ''),
};
