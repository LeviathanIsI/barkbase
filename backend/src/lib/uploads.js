const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const env = require('../config/env');

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = req.tenantId ?? 'public';
    const folder = path.join(
      env.uploads.root,
      tenantId,
      new Date().toISOString().slice(0, 10),
    );
    ensureDir(folder)
      .then(() => cb(null, folder))
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
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = {
  upload,
  ensureDir,
};
