// Import express-validator
const { body } = require('express-validator');

// Import model User yang sudah kita buat dengan Mongoose
const User = require('../../models/user.js'); // Pastikan path-nya benar sesuai struktur proyekmu

// Definisikan validasi untuk membuat atau mengupdate user
const validateUser = [
    body('username') // Tambahkan validasi untuk username
        .notEmpty().withMessage('Username is required')
        .custom(async (value, { req }) => {
            if (!value) {
                throw new Error('Username is required');
            }
            // Cari user berdasarkan username
            const user = await User.findOne({ username: value });

            // Jika user ditemukan DAN user ID-nya berbeda dengan user yang sedang diupdate (jika ada)
            // Ini penting untuk "update" agar user bisa menyimpan data tanpa mengubah username/email-nya
            // Kecuali jika username/email itu sudah dipakai oleh user lain.
            if (user && user._id.toString() !== req.params.id) { // MongoDB _id adalah ObjectId, perlu .toString()
                throw new Error('Username already exists');
            }
            return true;
        }),
    body('name').notEmpty().withMessage('Name is required'),
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is invalid')
        .custom(async (value, { req }) => {
            if (!value) {
                throw new Error('Email is required');
            }
            // Cari user berdasarkan email
            const user = await User.findOne({ email: value });

            // Jika user ditemukan DAN user ID-nya berbeda dengan user yang sedang diupdate
            if (user && user._id.toString() !== req.params.id) { // MongoDB _id adalah ObjectId, perlu .toString()
                throw new Error('Email already exists');
            }
            return true;
        }),
    // Password hanya wajib saat membuat user baru, tidak saat update jika tidak diisi
    // Jika ada di request, baru divalidasi panjangnya.
    body('password')
        .optional({ checkFalsy: true }) // Izinkan kosong saat update, tapi jika ada, validasi
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

    // Tambahkan validasi untuk field lain seperti yang ada di Schema User:
    body('phone_number').optional().isMobilePhone('id-ID').withMessage('Invalid phone number format'),
    body('address.street').optional().notEmpty().withMessage('Street cannot be empty if address is provided'),
    body('address.city').optional().notEmpty().withMessage('City cannot be empty if address is provided'),
    body('address.province').optional().notEmpty().withMessage('Province cannot be empty if address is provided'),
    body('address.postal_code').optional().notEmpty().withMessage('Postal code cannot be empty if address is provided'),
    body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
];

module.exports = { validateUser };