// Import express-validator
const { validationResult } = require("express-validator");

// Import bcrypt
const bcrypt = require("bcryptjs");

// Import jsonwebtoken
const jwt = require("jsonwebtoken");

// Import Model User Mongoose
const User = require("../models/user.js"); // Sesuaikan path jika berbeda

// Import response formatter functions
const {
  ok,
  badRequest,
  unauthorized,
  notFound,
  internalServerError,
} = require("../utils/response/responseFormatter"); // Sesuaikan path jika berbeda

// Function login
const login = async (req, res) => {
  // Periksa hasil validasi dari express-validator
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Jika ada error validasi, kembalikan error menggunakan badRequest
    return badRequest(res, "Validation error", errors.array());
  }

  const { email, password } = req.body; // Destrukturisasi email dan password dari request body

  try {
    // Cari user berdasarkan email
    // Penting: Tambahkan .select('+password') untuk mengambil field password
    // karena kita set select: false di schema Mongoose untuk keamanan default.
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // user not found
    if (!user) {
      // Gunakan notFound dari responseFormatter
      return notFound(res, "Invalid credentials. Email or password incorrect.");
    }

    // compare password
    const validPassword = await bcrypt.compare(password, user.password);

    // password incorrect
    if (!validPassword) {
      // Gunakan unauthorized dari responseFormatter
      return unauthorized(res, "Invalid credentials. Email or password incorrect.");
    }

    // generate token JWT
    // Menggunakan user._id karena MongoDB menggunakan _id sebagai ID
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1h", // Token akan kadaluarsa dalam 1 jam
    });

    // Destructure to remove password from user object before sending response
    const userResponse = user.toObject(); // Konversi dokumen Mongoose ke plain JS object
    delete userResponse.password; // Hapus password dari objek yang akan dikirim

    // Return response menggunakan ok dari responseFormatter
    return ok(res, "Login successfully", {
      user: userResponse,
      token: token,
    });

  } catch (error) {
    // Penanganan error jika ada masalah saat login
    console.error("Error during user login:", error); // Log error untuk debugging

    // Tangani error tak terduga
    return internalServerError(res, "Internal server error.");
  }
};

module.exports = { login };