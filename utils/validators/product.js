// src/utils/validators/product.js

const { body } = require('express-validator');

// Import model Product
const Product = require('../../models/product.js'); // Pastikan path-nya benar

// Definisikan validasi untuk membuat atau mengupdate produk
const validateProduct = [
    // Validasi 'name'
    body('name')
        .notEmpty().withMessage('Product name is required')
        .isLength({ min: 3, max: 200 }).withMessage('Product name must be between 3 and 200 characters')
        .custom(async (value, { req }) => {
            if (!value) { // Jika nama kosong, validasi notEmpty sudah menangani
                return true;
            }
            // Cari produk berdasarkan nama
            const product = await Product.findOne({ name: value });

            // Jika produk ditemukan DAN ID-nya berbeda dari produk yang sedang diupdate
            // Ini untuk skenario update: produk bisa menyimpan namanya jika tidak ada produk lain dengan nama itu
            if (product && product._id.toString() !== req.params.id) {
                throw new Error('Product with this name already exists');
            }
            return true;
        }),

    // Validasi 'description'
    body('description')
        .notEmpty().withMessage('Product description is required')
        .isLength({ max: 1000 }).withMessage('Product description cannot exceed 1000 characters'),

    // Validasi 'price'
    body('price')
        .notEmpty().withMessage('Product price is required')
        .isFloat({ min: 0 }).withMessage('Product price must be a positive number'),

    // Validasi 'discount_price'
    body('discount_price')
        .optional({ checkFalsy: true }) // Izinkan kosong, tapi jika ada, validasi
        .isFloat({ min: 0 }).withMessage('Discount price must be a positive number')
        .custom((value, { req }) => {
            // Pastikan discount_price tidak lebih besar dari price
            if (value !== undefined && req.body.price !== undefined && value > req.body.price) {
                throw new Error('Discount price cannot be greater than the original price');
            }
            return true;
        }),

    // Validasi 'stock'
    body('stock')
        .notEmpty().withMessage('Product stock is required')
        .isInt({ min: 0 }).withMessage('Product stock must be a non-negative integer'),

    // Validasi 'category'
    body('category')
        .notEmpty().withMessage('Product category is required')
        .isLength({ max: 50 }).withMessage('Product category cannot exceed 50 characters'),

    // Validasi 'brand'
    body('brand')
        .optional({ checkFalsy: true })
        .isLength({ max: 100 }).withMessage('Brand name cannot exceed 100 characters'),

    // Validasi 'images' (untuk string JSON array)
    // Multer akan menangani file fisik. Di sini, kita validasi jika 'images' dikirim sebagai string JSON.
    body('images')
        .optional({ checkFalsy: true })
        .custom((value, { req }) => {
            // Jika ada nilai dan itu string, coba parse sebagai JSON array
            if (value && typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (!Array.isArray(parsed)) {
                        throw new Error('Images field must be a valid JSON array string');
                    }
                    // Anda bisa menambahkan validasi lebih lanjut untuk setiap elemen array di sini
                    // Misalnya, apakah itu URL yang valid
                    // For example: if (parsed.some(img => typeof img !== 'string' || !img.startsWith('http')))
                } catch (e) {
                    throw new Error('Images field must be a valid JSON array string');
                }
            } else if (value && !Array.isArray(value)) { // Jika bukan string dan bukan array, itu salah
                 throw new Error('Images field must be a valid JSON array string or an actual array');
            }
            return true;
        }),

    // Catatan: 'product_image' (jika Anda pakai upload.single) atau field file dari 'images' (jika upload.array)
    // akan divalidasi oleh Multer (tipe file, ukuran) dan bukan oleh express-validator di sini.
    // Error Multer akan ditangkap di controller setelah Multer berjalan.
];

module.exports = { validateProduct };