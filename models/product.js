const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Nama Produk
  name: {
    type: String,
    required: [true, 'Nama produk wajib diisi'],
    trim: true,
    minlength: [3, 'Nama produk minimal 3 karakter'],
    maxlength: [200, 'Nama produk maksimal 200 karakter']
  },

  // Deskripsi Produk
  description: {
    type: String,
    required: [true, 'Deskripsi produk wajib diisi'],
    trim: true,
    maxlength: [1000, 'Deskripsi produk maksimal 1000 karakter']
  },

  // Harga Produk
  price: {
    type: Number,
    required: [true, 'Harga produk wajib diisi'],
    min: [0, 'Harga tidak boleh negatif'] // Harga tidak boleh kurang dari 0
  },

  // Harga Diskon (Opsional)
  discount_price: {
    type: Number,
    min: [0, 'Harga diskon tidak boleh negatif'],
    // Custom validator: Harga diskon tidak boleh lebih besar dari harga asli
    validate: {
      validator: function(value) {
        return value === undefined || value <= this.price;
      },
      message: 'Harga diskon tidak boleh lebih besar dari harga asli'
    }
  },

  // Kuantitas Stok
  stock: {
    type: Number,
    required: [true, 'Stok produk wajib diisi'],
    min: [0, 'Stok tidak boleh negatif'],
    default: 0 // Default stok adalah 0 jika tidak ditentukan
  },

  // Kategori Produk (bisa berupa ID referensi ke model Kategori terpisah jika ada)
  category: {
    type: String,
    required: [true, 'Kategori produk wajib diisi'],
    trim: true,
    maxlength: [50, 'Kategori maksimal 50 karakter']
    // Jika Anda punya model Category, ini bisa jadi: type: mongoose.Schema.Types.ObjectId, ref: 'Category'
  },

  // Gambar Produk (Array untuk multiple images)
  images: [
    {
      type: String,
      default: 'default-product.png' // Gambar produk default jika tidak ada
    }
  ],

  // Penjual/Brand (bisa berupa ID referensi ke model User/Seller terpisah)
  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'Nama brand maksimal 100 karakter']
    // Jika Anda punya model Seller, ini bisa jadi: type: mongoose.Schema.Types.ObjectId, ref: 'User' (jika user juga bisa jadi seller)
  },

  // Tanggal Pembuatan dan Pembaruan
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now // Akan diupdate oleh middleware 'save'
  }
});

// Middleware untuk otomatis update 'updatedAt' saat dokumen disimpan
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware untuk memastikan diskon tidak lebih dari harga asli saat update
// (Hanya jika discount_price dimodifikasi DAN ada price)
productSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate(); // Mendapatkan objek update
  if (update.$set && update.$set.discount_price !== undefined && update.$set.price !== undefined) {
    if (update.$set.discount_price > update.$set.price) {
      const error = new Error('Harga diskon tidak boleh lebih besar dari harga asli.');
      error.name = 'ValidationError'; // Set nama error agar Mongoose menanganinya
      return next(error);
    }
  }
  next();
});


const Product = mongoose.model('Product', productSchema);

module.exports = Product;