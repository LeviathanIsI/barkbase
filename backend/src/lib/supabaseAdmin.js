const { getSupabaseClient } = require('./supabase');

class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase is not configured. Provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    this.name = 'SupabaseNotConfiguredError';
    this.statusCode = 500;
  }
}

const getClientOrThrow = () => {
  const client = getSupabaseClient();
  if (!client) {
    throw new SupabaseNotConfiguredError();
  }
  return client;
};

const mapError = (error) => {
  if (!error) return null;
  const mapped = new Error(error.message || 'Supabase request failed');
  mapped.code = error.code;
  mapped.details = error.details;
  mapped.hint = error.hint;
  return mapped;
};

module.exports = {
  getClientOrThrow,
  mapError,
};
