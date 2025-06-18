// middlewares/upload.js

const multer = require('multer');
const path = require('path');

// Konfigurasi penyimpanan untuk Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Tentukan folder penyimpanan file.
    // Misalnya, 'uploads/avatars' di root proyekmu.
    // Pastikan folder ini ADA di proyekmu, jika tidak, Multer akan error.
    cb(null, 'uploads/avatars');
  },
  filename: (req, file, cb) => {
    // Beri nama file yang unik untuk menghindari tabrakan nama
    // Contoh: fieldname-timestamp.ext (e.g., profile_picture-1678888888888.jpg)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filter file berdasarkan tipe MIME (hanya izinkan gambar)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // Izinkan upload
  } else {
    // Tolak upload dan berikan error
    cb(new Error('Hanya file gambar (JPEG, PNG, GIF, WEBP) yang diizinkan!'), false);
  }
};

// Inisialisasi Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Batasi ukuran file hingga 5MB (5 * 1024 * 1024 bytes)
  }
});

module.exports = upload;