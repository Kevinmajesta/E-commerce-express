// middlewares/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Hanya file gambar (JPEG, PNG, GIF, WEBP) yang diizinkan!'), false);
    }
};

const configureMulter = (destFolder, maxFileSizeMB) => {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, '..', 'uploads', destFolder);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            // Nama file akan menyertakan fieldname, misal: product_image-12345.jpg, images-67890.png
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    });

    return multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: maxFileSizeMB * 1024 * 1024
        }
    });
};

module.exports = { configureMulter }; // Ekspor fungsi konfigurasi