const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipi i skedarit nuk pranohet. Lejo: jpg, png, webp.'));
    }
  },
});

// POST /api/upload/vehicle-photo
router.post('/vehicle-photo', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nuk u dërgua asnjë foto.' });

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'rentoks/vehicles', resource_type: 'image' },
        (err, data) => (err ? reject(err) : resolve(data))
      );
      Readable.from(req.file.buffer).pipe(stream);
    });
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error('Cloudinary upload:', err.message);
    res.status(500).json({ error: 'Ngarkimi i fotos dështoi.' });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Foto shumë e madhe. Max 5MB.' });
  }
  res.status(400).json({ error: err.message || 'Gabim gjatë ngarkimit.' });
});

module.exports = router;
