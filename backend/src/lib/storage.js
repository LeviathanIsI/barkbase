const fs = require('fs/promises');
const env = require('../config/env');
const logger = require('../utils/logger');
const { getSupabaseClient } = require('./supabase');

const ensureBuffer = async (bufOrPath) => {
  if (Buffer.isBuffer(bufOrPath)) {
    return bufOrPath;
  }
  if (typeof bufOrPath === 'string') {
    return fs.readFile(bufOrPath);
  }
  throw new Error('Storage payload must be a Buffer or filesystem path');
};

const toFolderAndName = (key) => {
  const normalized = key.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const name = parts.pop();
  const folder = parts.join('/');
  return { folder, name, normalized };
};

const getSupabaseStore = () => {
  const client = getSupabaseClient();
  const bucket = env.supabase?.storageBucket;
  if (!client || !bucket) {
    throw new Error('Supabase storage is not configured');
  }

  return {
    async put(bufOrPath, key, opts = {}) {
      const buffer = await ensureBuffer(bufOrPath);
      const { data, error } = await client.storage
        .from(bucket)
        .upload(key, buffer, {
          upsert: true,
          contentType: opts.contentType,
        });

      if (error) {
        throw error;
      }

      return { key: data?.path ?? key, size: buffer.byteLength };
    },
    getUrl(key) {
      const { data } = client.storage.from(bucket).getPublicUrl(key);
      return data?.publicUrl ?? null;
    },
    async exists(key) {
      const { folder, name } = toFolderAndName(key);
      const { data, error } = await client.storage.from(bucket).list(folder || undefined, {
        search: name,
        limit: 1,
      });
      if (error) {
        if (error.statusCode === '404') {
          return false;
        }
        throw error;
      }
      return Array.isArray(data) && data.some((entry) => entry.name === name);
    },
    async delete(key) {
      const { error } = await client.storage.from(bucket).remove([key]);
      if (error) {
        if (error.statusCode === '404') {
          return;
        }
        throw error;
      }
    },
  };
};

let cachedStore = null;

const getStorageForTenant = () => {
  if (!cachedStore) {
    try {
      cachedStore = getSupabaseStore();
    } catch (error) {
      logger.error({ error }, 'Supabase storage unavailable');
      throw error;
    }
  }
  return cachedStore;
};

module.exports = {
  getStorageForTenant,
};
