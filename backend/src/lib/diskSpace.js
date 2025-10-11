const path = require('path');
const checkDiskSpace = require('check-disk-space').default;
const env = require('../config/env');

const BYTES_PER_MB = 1024 * 1024;

const ensureDiskSpace = async (targetPath, reserveBytes = 0, minimumFreeBytes = env.storage.minFreeBytes) => {
  const resolved = path.resolve(targetPath);
  let info;
  try {
    info = await checkDiskSpace(resolved);
  } catch (error) {
    throw Object.assign(new Error('Unable to determine available disk space'), {
      statusCode: 507,
      code: 'DISK_SPACE_CHECK_FAILED',
      meta: { path: resolved },
    });
  }

  const baseMin = Math.max(0, minimumFreeBytes ?? 0);
  const requiredFree = baseMin + Math.max(0, reserveBytes);
  if (info.free < requiredFree) {
    const deficitBytes = requiredFree - info.free;
    const deficitMb = Math.ceil(deficitBytes / BYTES_PER_MB);
    const message = `Not enough disk space. Free at least ${deficitMb} MB (remove old exports/uploads or clear workspace storage) and try again.`;
    throw Object.assign(new Error(message), {
      statusCode: 507,
      code: 'DISK_SPACE_LOW',
      meta: {
        path: resolved,
        freeBytes: info.free,
        requiredBytes: requiredFree,
      },
    });
  }
};

module.exports = {
  ensureDiskSpace,
};
