// database/index.js

const mongoose = require('mongoose');

const dbURI = 'mongodb://localhost:27017/ecommerce_project'; // Pastikan nama database sama dengan yang kamu inginkan

const connectDB = async () => {
  try {
    await mongoose.connect(dbURI, {
      // Opsi-opsi ini sudah tidak diperlukan di driver MongoDB Node.js versi 4.0.0 ke atas
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log('Koneksi ke MongoDB berhasil!');
  } catch (err) {
    console.error('Gagal koneksi ke MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;