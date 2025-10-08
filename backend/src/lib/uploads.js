const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const env = require('../config/env');
const { ensureDiskSpace } = require('./diskSpace');

const MAX_FILE_SIZE_BYTES = env.storage.maxUploadFileBytes;
const MAX_TENANT_FILES = env.storage.maxTenantFiles;

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const countFilesRecursive = async (dir) => {
  let count = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return 0;
    }
    throw error;
  }

  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += await countFilesRecursive(fullPath);
      } else if (entry.isFile()) {
        count += 1;
      }
    }),
  );

  return count;
};

const ensureTenantUploadCapacity = async (tenantKey) => {
  const uploadRoot = path.join(env.storage.root, 'tenants', tenantKey, 'uploads');
  await ensureDir(uploadRoot).catch(() => {});
  await ensureDiskSpace(uploadRoot, MAX_FILE_SIZE_BYTES, env.storage.minFreeUploadBytes);

  if (MAX_TENANT_FILES > 0) {
    const currentCount = await countFilesRecursive(uploadRoot);
    if (currentCount >= MAX_TENANT_FILES) {
      const error = Object.assign(
        new Error('Upload limit reached. Delete older files or upgrade your plan to free space.'),
        { statusCode: 413, code: 'UPLOAD_LIMIT_REACHED', meta: { maxTenantFiles: MAX_TENANT_FILES } },
      );
      throw error;
    }
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantKey = (req.tenant?.slug ?? req.tenantId ?? 'public').toLowerCase();
    const uploadRoot = path.join(env.storage.root, 'tenants', tenantKey, 'uploads');
    const datedFolder = path.join(uploadRoot, new Date().toISOString().slice(0, 10));

    ensureTenantUploadCapacity(tenantKey)
      .then(() => ensureDir(datedFolder))
      .then(() => cb(null, datedFolder))
      .catch((error) => cb(error));
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const fileFilter = (_req, file, cb) => {
  if (!allowedMime.includes(file.mimetype)) {
    return cb(new Error('Unsupported file type'));
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

module.exports = {
  upload,
  ensureDir,
};
