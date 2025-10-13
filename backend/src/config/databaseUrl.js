const { URL } = require('url');
let cached;

const DEFAULT_DB_NAME = process.env.SUPABASE_DB_NAME || 'postgres';
const DEFAULT_SSL_MODE = process.env.SUPABASE_SSLMODE || 'require';

const expandTemplate = (raw) => {
  if (!raw) return raw;
  return raw.replace(/\$\{([^}]+)\}/g, (_, key) => {
    if (key === 'SUPABASE_DB_NAME') return DEFAULT_DB_NAME;
    if (key === 'SUPABASE_SSLMODE') return DEFAULT_SSL_MODE;
    return process.env[key] ?? '';
  });
};

const redactCredentials = (rawUrl) => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.username) parsed.username = '****';
    if (parsed.password) parsed.password = '****';
    return parsed.toString();
  } catch (_error) {
    return rawUrl;
  }
};

const buildConnectionMeta = (resolvedUrl, source, nodeEnv) => {
  const parsed = new URL(resolvedUrl);
  const host = parsed.hostname;
  const port = parsed.port || '5432';
  const isPooler =
    port === '6543' ||
    parsed.searchParams.get('pgbouncer') === 'true' ||
    host.includes('pooler');

  return {
    url: resolvedUrl,
    redactedUrl: redactCredentials(resolvedUrl),
    host,
    port,
    isPooler,
    source,
    nodeEnv,
  };
};

const resolveUrlFromEnv = () => {
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  const { DEV_DATABASE_URL, PROD_DATABASE_URL, DATABASE_URL } = process.env;

  if (nodeEnv === 'production') {
    const candidate = expandTemplate(PROD_DATABASE_URL || DATABASE_URL);
    if (!candidate) {
      throw new Error(
        'PROD_DATABASE_URL is not set. Configure Supabase PgBouncer URL before starting the server.',
      );
    }
    return buildConnectionMeta(candidate, 'PROD_DATABASE_URL', nodeEnv);
  }

  const candidate = expandTemplate(DEV_DATABASE_URL || DATABASE_URL || PROD_DATABASE_URL);
  if (!candidate) {
    throw new Error(
      'DEV_DATABASE_URL is not set. Configure Supabase direct URL before starting the server.',
    );
  }
  return buildConnectionMeta(candidate, 'DEV_DATABASE_URL', nodeEnv);
};

function getDatabaseUrl() {
  if (!cached) {
    cached = resolveUrlFromEnv();
    process.env.DATABASE_URL = cached.url;
  }
  return cached.url;
}

function getConnectionInfo() {
  if (!cached) {
    getDatabaseUrl();
  }
  return { ...cached };
}

module.exports = {
  getDatabaseUrl,
  getConnectionInfo,
  redactCredentials,
};
