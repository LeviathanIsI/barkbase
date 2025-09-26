const path = require('path');
const sharp = require('sharp');
const { ensureDir } = require('./uploads');

const processImage = async ({ inputPath, outputDir, sizes = [320, 640] }) => {
  await ensureDir(outputDir);
  const resized = await Promise.all(
    sizes.map(async (size) => {
      const filename = `${path.parse(inputPath).name}-${size}.webp`;
      const target = path.join(outputDir, filename);
      await sharp(inputPath)
        .resize({ width: size, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(target);
      return target;
    }),
  );
  return resized;
};

module.exports = {
  processImage,
};
