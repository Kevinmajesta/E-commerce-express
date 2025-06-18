const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Nama produk wajib diisi"],
    trim: true,
    minlength: [3, "Nama produk minimal 3 karakter"],
    maxlength: [200, "Nama produk maksimal 200 karakter"],
  },

  description: {
    type: String,
    required: [true, "Deskripsi produk wajib diisi"],
    trim: true,
    maxlength: [1000, "Deskripsi produk maksimal 1000 karakter"],
  },

  price: {
    type: Number,
    required: [true, "Harga produk wajib diisi"],
    min: [0, "Harga tidak boleh negatif"],
  },

  discount_price: {
    type: Number,
    min: [0, "Harga diskon tidak boleh negatif"],
    // The inline 'validate' option is removed as we're handling this in pre('findOneAndUpdate')
  },

  stock: {
    type: Number,
    required: [true, "Stok produk wajib diisi"],
    min: [0, "Stok tidak boleh negatif"],
    default: 0,
  },

  category: {
    type: String,
    required: [true, "Kategori produk wajib diisi"],
    trim: true,
    maxlength: [50, "Kategori maksimal 50 karakter"],
  },

  images: [
    {
      type: String,
      default: "default-product.png",
    },
  ],

  brand: {
    type: String,
    trim: true,
    maxlength: [100, "Nama brand maksimal 100 karakter"],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

productSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

productSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  if (update.$set && update.$set.discount_price !== undefined) {
    const newDiscountPrice = Number(update.$set.discount_price);
    let effectivePrice;

    if (update.$set.price !== undefined) {
      effectivePrice = Number(update.$set.price);
    } else {
      // If price is not part of the current update, fetch the current price from the document
      const existingProduct = await this.model.findOne(this.getQuery()).select("price").lean();
      if (!existingProduct) {
        // This case is rare, but if the product doesn't exist, it's an error
        return next(new Error("Product not found during discount price validation."));
      }
      effectivePrice = Number(existingProduct.price);
    }

    if (newDiscountPrice > effectivePrice) {
      const error = new Error("Harga diskon tidak boleh lebih besar dari harga asli.");
      error.name = "ValidationError"; // Set name for consistent error handling
      return next(error);
    }
  }
  next();
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;