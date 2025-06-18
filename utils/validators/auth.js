// src/utils/validators/auth.js
const { body } = require('express-validator');
const User = require('../../models/user.js'); // Pastikan path-nya benar

const validateRegister = [
    body('username')
        .notEmpty().withMessage('Username is required')
        .custom(async (value) => {
            if (!value) { return true; } // notEmpty handles this
            const user = await User.findOne({ username: value });
            if (user) { throw new Error('Username already exists'); }
            return true;
        }),
    body('name').notEmpty().withMessage('Name is required'),
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is invalid')
        .custom(async (value) => {
            if (!value) { return true; } // notEmpty handles this
            const user = await User.findOne({ email: value });
            if (user) { throw new Error('Email already exists'); }
            return true;
        }),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('phone_number').optional().isMobilePhone('id-ID').withMessage('Invalid phone number format'),
    body('address.street').optional().notEmpty().withMessage('Street cannot be empty if address is provided'),
];

const validateLogin = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email is invalid'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

module.exports = { validateRegister, validateLogin };