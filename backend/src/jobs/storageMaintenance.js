const path = require('path');
const fs = require('fs/promises');
const cron = require('node-cron');
const env = require('../config/env');

const MAX_EXPORTS = Math.max(1, env.storage.maxExports ?? 10);
const MAX_BACKUPS = Math.max(1, env.storage.maxBackups ?? 5);
const EXPORTS_ROOT = path.join(env.storage.root, 'tenants');
const TEMP_ROOT = path.join(env.storage.root, 'temp');

const pruneTempFiles = async () => {
  const cutoff = Date.now() - 72 * 60 * 60 * 1000;
  try {
    const entries = await fs.readdir(TEMP_ROOT, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const target = path.join(TEMP_ROOT, entry.name);
        try {
          const stats = await fs.stat(target);
          if (stats.isFile() && stats.mtimeMs < cutoff) {
            await fs.unlink(target);
          } else if (stats.isDirectory()) {
            await pruneDirectory(target, cutoff);
          }
        } catch {
          /* ignore */
        }
      }),
    );
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[storage] Failed to prune temp files', error.message);
    }
  }
};

const pruneDirectory = async (dir, cutoff) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(dir, entry.name);
      const stats = await fs.stat(target);
      if (stats.isFile() && stats.mtimeMs < cutoff) {
        await fs.unlink(target);
      } else if (stats.isDirectory()) {
        await pruneDirectory(target, cutoff);
        const remaining = await fs.readdir(target);
        if (remaining.length === 0) {
          await fs.rmdir(target);
        }
      }
    }),
  );
};

const pruneExports = async (tenantDir, limit) => {
  try {
    const files = await fs.readdir(tenantDir);
    if (files.length <= limit) {
      return;
    }
    const detailed = await Promise.all(
      files.map(async (file) => {
        const target = path.join(tenantDir, file);
        const stats = await fs.stat(target);
        return { file, target, mtime: stats.mtimeMs };
      }),
    );
    detailed
      .sort((a, b) => b.mtime - a.mtime)
      .slice(limit)
      .forEach(async ({ target }) => {
        try {
          await fs.unlink(target);
        } catch {
          /* ignore */
        }
      });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[storage] Failed to prune exports in', tenantDir, error.message);
    }
  }
};

const pruneBackups = async (tenantDir, limit) => pruneExports(tenantDir, limit);

const runMaintenance = async () => {
  await pruneTempFiles();
  try {
    const tenantDirs = await fs.readdir(EXPORTS_ROOT, { withFileTypes: true });
    await Promise.all(
      tenantDirs.map(async (entry) => {
        if (!entry.isDirectory()) return;
        const baseDir = path.join(EXPORTS_ROOT, entry.name);
        await pruneExports(path.join(baseDir, 'exports'), MAX_EXPORTS);
        await pruneBackups(path.join(baseDir, 'backups'), MAX_BACKUPS);
      }),
    );
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[storage] Failed to inspect tenant storage', error.message);
    }
  }
};

const scheduleStorageMaintenance = () => {
  cron.schedule('30 3 * * *', () => {
    runMaintenance().catch((error) => {
      console.warn('[storage] Maintenance job failed', error.message);
    });
  });
};

module.exports = {
  scheduleStorageMaintenance,
  runMaintenance,
};
