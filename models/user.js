const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username wajib diisi'],
    unique: true, // Username harus unik
    trim: true,
    lowercase: true, // Simpan username dalam huruf kecil untuk konsistensi
    minlength: [3, 'Username minimal 3 karakter'],
    maxlength: [30, 'Username maksimal 30 karakter']
  },
  name: {
    type: String,
    required: [true, 'Nama lengkap wajib diisi'],
    trim: true,
    maxlength: [100, 'Nama lengkap maksimal 100 karakter']
  },
  email: {
    type: String,
    required: [true, 'Email wajib diisi'],
    unique: true, // Email harus unik
    trim: true,
    lowercase: true, // Simpan email dalam huruf kecil
    // Anda bisa menambahkan regex validator untuk format email
    match: [/.+@.+\..+/, 'Format email tidak valid']
  },
  password: {
    type: String,
    required: [true, 'Password wajib diisi'],
    minlength: [6, 'Password minimal 6 karakter'],
    // Penting: Password harus di-hash sebelum disimpan ke database!
    // Kita akan lakukan ini di middleware Mongoose atau di controller
    select: false // Defaultnya tidak ikut terambil saat query, untuk keamanan
  },
  phone_number: { // Menggunakan snake_case untuk konsistensi di database
    type: String,
    // required: true, // Tergantung apakah nomor HP wajib atau tidak
    trim: true,
    maxlength: [15, 'Nomor telepon maksimal 15 digit']
  },
  address: { // Bisa lebih kompleks, tapi ini awal yang baik
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    province: { type: String, trim: true },
    postal_code: { type: String, trim: true }
  },
  profile_picture: {
    type: String,
    default: 'default-avatar.png' // Gambar profil default
  },
  role: {
    type: String,
    enum: ['user', 'admin'], // Hanya bisa 'user' atau 'admin'
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now // Akan diupdate manual atau pakai middleware
  }
});

// Middleware untuk otomatis update 'updatedAt' (opsional, tapi bagus)
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;