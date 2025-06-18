// src/controllers/RegisterController.js
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const fs = require('fs'); // Import fs module for file deletion

// Import response formatter functions
const {
  created,
  badRequest,
  conflict,
  internalServerError
} = require("../utils/response/responseFormatter");

// Import email service
const { sendWelcomeEmail } = require("../utils/email/emailService"); // <--- Import email service

// Import custom error classes and handler
const {
  ValidationError,
  ConflictError,
  handleMongooseError // Ini sangat penting untuk menormalisasi error DB
} = require("../utils/errorHandler/errorHandler");

// Ambil default avatar
const { DEFAULT_AVATAR } = require('../config/constants'); // Pastikan ini diimpor jika digunakan

// Function register
const register = async (req, res) => {
  const errors = validationResult(req);

  // Ambil data dari req.body
  let { username, name, email, password, phone_number, address } = req.body;

  // --- Parsing Address ---
  // Pastikan Anda memanggil fileHandler.deleteFile jika gagal parse JSON
  if (address && typeof address === 'string') {
    try {
      address = JSON.parse(address);
    } catch (e) {
      if (req.file) { // Hapus file jika gagal parse JSON
        // Gunakan fileHandler.deleteFile
        fileHandler.deleteFile(req.file.path, "Error deleting uploaded file on invalid address JSON:");
      }
      return badRequest(res, "Validation error", [{ param: 'address', msg: 'Address must be a valid JSON string.' }]);
    }
  }
  // --- Akhir Parsing Address ---


  if (!errors.isEmpty()) {
    // Jika ada error validasi dari express-validator, hapus file yang diupload
    if (req.file) {
      // Gunakan fileHandler.deleteFile
      fileHandler.deleteFile(req.file.path, "Error deleting uploaded file on validation error:");
    }
    return badRequest(res, "Validation error", errors.array());
  }

  // Ambil nama file dari req.file jika ada, gunakan DEFAULT_AVATAR jika tidak
  const profile_picture = req.file ? req.file.filename : DEFAULT_AVATAR;

  try {
    // Password akan di-hash oleh middleware pre('save') di model User,
    // jadi di sini kita hanya meneruskan 'password' mentah.
    const user = await User.create({
      username: username.toLowerCase(),
      name: name,
      email: email.toLowerCase(),
      password: password, // <-- Model akan menghash ini
      phone_number: phone_number,
      address: address,
      profile_picture: profile_picture,
      // role akan menggunakan default 'user' jika tidak disediakan
    });

    const userResponse = user.toObject();
    delete userResponse.password; // Hapus password sebelum mengembalikan respons

    // --- Kirim Email Selamat Datang ---
    // Panggil fungsi pengiriman email. Jangan menunggu hasilnya jika ingin respons cepat.
    sendWelcomeEmail(user.email, user.name)
      .catch(err => console.error(`Failed to send welcome email to ${user.email}:`, err));
    // --- Akhir Kirim Email ---

    return created(res, "Register successfully", userResponse);

  } catch (error) {
    // Jika terjadi error database (misal: duplikat username/email), hapus file yang mungkin sudah terupload
    if (req.file) {
      // Gunakan fileHandler.deleteFile
      fileHandler.deleteFile(req.file.path, "Error deleting uploaded file on DB error:");
    }

    console.error("Error during user registration:", error);

    // Gunakan handleMongooseError untuk menormalisasi error database
    const handledError = handleMongooseError(error);

    if (handledError.name === 'ValidationError') {
      return badRequest(res, handledError.message, handledError.details);
    }
    if (handledError.name === 'ConflictError') {
      return conflict(res, handledError.message, handledError.details);
    }
    // Jika ada error Multer yang tidak tertangkap middleware sebelumnya (jarang terjadi di sini)
    if (error.message && error.message.includes('Hanya file gambar')) { // Ini dari fileFilter Multer
        return badRequest(res, error.message);
    }

    // Untuk error yang tidak terduga lainnya
    return internalServerError(res, "Internal server error.");
  }
};

module.exports = { register };