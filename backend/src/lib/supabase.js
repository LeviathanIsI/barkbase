const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');
const logger = require('../utils/logger');

let cachedClient = null;

const getSupabaseClient = () => {
  if (!env.supabase?.url || !env.supabase?.serviceRoleKey) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: env.supabase.useRls
          ? {
              'X-Client-Info': 'barkbase-backend',
            }
          : undefined,
      },
    });
    logger.info('Supabase client initialised for tenant settings');
  }
  return cachedClient;
};

module.exports = {
  getSupabaseClient,
};
