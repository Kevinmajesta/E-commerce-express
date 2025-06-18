// Import express-validator
const { validationResult } = require("express-validator");

// Import bcrypt
const bcrypt = require("bcryptjs");

// Import Model User Mongoose
const User = require("../models/user.js"); // Adjust path if needed

// Import response formatter functions
const {
  created,
  badRequest,
  conflict,
  internalServerError
} = require("../utils/response/responseFormatter"); // Adjust path if needed

const fs = require('fs'); // Import fs module for file deletion


// Function register
const register = async (req, res) => {
  // Periksa hasil validasi dari express-validator
  const errors = validationResult(req);

  // Ambil data dari req.body
  let { username, name, email, password, phone_number, address } = req.body; // <-- address juga diambil

  // --- Tambahan Penting: Parsing Address ---
  // Jika 'address' ada dan berupa string, coba parse menjadi objek
  if (address && typeof address === 'string') {
    try {
      address = JSON.parse(address);
    } catch (e) {
      // Jika gagal parse JSON, anggap itu sebagai error validasi
      const customErrors = [{ param: 'address', msg: 'Address must be a valid JSON string.' }];
      if (req.file) { // Hapus file jika ada error validasi di sini
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting uploaded file:", err);
        });
      }
      return badRequest(res, "Validation error", customErrors);
    }
  }
  // --- Akhir Tambahan Parsing Address ---


  if (!errors.isEmpty()) {
    // Jika ada error validasi, dan ada file yang diupload, hapus file tersebut
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting uploaded file:", err);
      });
    }
    return badRequest(res, "Validation error", errors.array());
  }


  // Ambil nama file dari req.file jika ada
  const profile_picture = req.file ? req.file.filename : 'default-avatar.png'; // Gunakan nama file dari Multer


  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: username.toLowerCase(),
      name: name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone_number: phone_number,
      address: address, // <-- Kini 'address' seharusnya sudah berupa objek
      profile_picture: profile_picture,
      // role akan menggunakan default 'user' jika tidak disediakan
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    return created(res, "Register successfully", userResponse);

  } catch (error) {
    // Jika terjadi error database, hapus file yang mungkin sudah terupload
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting uploaded file on DB error:", err);
      });
    }

    console.error("Error during user registration:", error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        param: err.path,
        msg: err.message
      }));
      return badRequest(res, error.message, validationErrors);
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
      return conflict(res, message, [{ param: field, msg: message }]);
    }

    return internalServerError(res, "Internal server error.");
  }
};

module.exports = { register };