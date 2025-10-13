const path = require('path');
const dotenv = require('dotenv');
const { getDatabaseUrl } = require('./databaseUrl');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const resolvedDatabaseUrl = getDatabaseUrl();

const uploadsRoot = path.resolve(process.cwd(), process.env.UPLOADS_ROOT ?? './uploads');
const dataRoot = path.resolve(process.cwd(), process.env.DATA_ROOT ?? process.env.UPLOADS_ROOT ?? './uploads');

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
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  port: parseNumber(process.env.PORT, 4000),
  host: process.env.HOST ?? '0.0.0.0',
  database: {
    url: resolvedDatabaseUrl,
    provider: process.env.DATABASE_PROVIDER ?? 'postgresql',
    hostedUrl: process.env.HOSTED_DATABASE_URL ?? null,
    devUrl: process.env.DEV_DATABASE_URL ?? null,
    prodUrl: process.env.PROD_DATABASE_URL ?? null,
    directUrl: process.env.DIRECT_URL ?? null,
    shadowUrl: process.env.SHADOW_DATABASE_URL ?? null,
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
    provider: process.env.EMAIL_PROVIDER ?? (process.env.NODE_ENV === 'test' ? 'json' : 'smtp'),
    from: process.env.EMAIL_FROM ?? 'no-reply@barkbase.local',
  },
  uploads: {
    root: uploadsRoot,
  },
  storage: {
    root: dataRoot,
    dataRoot,
    minFreeBytes: Math.max(0, parseNumber(process.env.STORAGE_MIN_FREE_MB, 500)) * 1024 * 1024,
    minFreeUploadBytes: Math.max(0, parseNumber(process.env.STORAGE_MIN_FREE_UPLOAD_MB, 1024)) * 1024 * 1024,
    maxTenantFiles: Math.max(0, parseNumber(process.env.STORAGE_MAX_TENANT_FILES, 100)),
    maxUploadFileBytes: Math.max(1, parseNumber(process.env.STORAGE_MAX_FILE_MB, 5)) * 1024 * 1024,
    maxExports: Math.max(1, parseNumber(process.env.STORAGE_MAX_EXPORTS, 10)),
    maxBackups: Math.max(1, parseNumber(process.env.STORAGE_MAX_BACKUPS, 5)),
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
  supabase: {
    url: process.env.SUPABASE_URL ?? null,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null,
    anonKey: process.env.SUPABASE_ANON_KEY ?? null,
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? null,
    useRls: (process.env.SUPABASE_USE_RLS ?? 'true').toLowerCase() !== 'false',
  },
};



