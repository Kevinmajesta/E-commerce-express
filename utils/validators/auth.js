// Import express-validator
const { body } = require('express-validator');

// Import model User yang sudah kita buat dengan Mongoose
const User = require('../../models/user.js'); // Pastikan path-nya benar

// Definisikan validasi untuk register
const validateRegister = [
    body('username') // Tambahkan validasi untuk username
        .notEmpty().withMessage('Username is required')
        .custom(async (value) => {
            if (!value) { // Cek lagi karena notEmpty mungkin tidak cukup untuk custom validator
                throw new Error('Username is required');
            }
            // Menggunakan Mongoose untuk mencari user berdasarkan username
            const user = await User.findOne({ username: value });
            if (user) {
                throw new Error('Username already exists');
            }
            return true;
        }),
    body('name').notEmpty().withMessage('Name is required'),
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is invalid')
        .custom(async (value) => {
            if (!value) { // Cek lagi karena notEmpty mungkin tidak cukup untuk custom validator
                throw new Error('Email is required');
            }
            // Menggunakan Mongoose untuk mencari user berdasarkan email
            const user = await User.findOne({ email: value });
            if (user) {
                throw new Error('Email already exists');
            }
            return true;
        }),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    // Tambahkan validasi untuk field lain jika diperlukan, seperti phone_number, address
    body('phone_number').optional().isMobilePhone('id-ID').withMessage('Invalid phone number format'), // Contoh validasi opsional
    body('address.street').optional().notEmpty().withMessage('Street cannot be empty if address is provided'),
];

// Definisikan validasi untuk login
const validateLogin = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is invalid'), // Tambahkan validasi format email juga di login
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

module.exports = { validateRegister, validateLogin };