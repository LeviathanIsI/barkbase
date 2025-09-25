const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseList = (value) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

module.exports = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseNumber(process.env.PORT, 4000),
  host: process.env.HOST ?? '0.0.0.0',
  database: {
    url: process.env.DATABASE_URL,
    provider: process.env.DATABASE_PROVIDER ?? 'sqlite',
  },
  tokens: {
    accessSecret: process.env.JWT_SECRET ?? 'changeme',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'changeme-refresh',
    accessTtlMinutes: parseNumber(process.env.ACCESS_TOKEN_TTL_MINUTES, 30),
    refreshTtlDays: parseNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 7),
  },
  cors: {
    allowedOrigins: parseList(process.env.CORS_ALLOWED_ORIGINS),
  },
  email: {
    provider: process.env.EMAIL_PROVIDER ?? 'smtp',
    from: process.env.EMAIL_FROM ?? 'no-reply@barkbase.local',
  },
  uploads: {
    root: path.resolve(process.cwd(), process.env.UPLOADS_ROOT ?? './uploads'),
  },
  tenancy: {
    defaultSlug: process.env.TENANT_DEFAULT_SLUG ?? 'default',
    baseDomain: process.env.BASE_DOMAIN ?? null,
    allowedHosts: (() => {
      const envHosts = parseList(process.env.TENANT_ALLOWED_HOSTS);
      if (envHosts.length > 0) {
        return envHosts;
      }
      return ['localhost', '127.0.0.1'];
    })(),
  },
};
