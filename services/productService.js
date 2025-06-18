// src/services/productService.js
const Product = require("../models/product");
const fileHandler = require("../utils/fileHandler/fileHandler");
const cacheService = require("./cacheService");
const {
  NotFoundError, // Mungkin tidak digunakan langsung di create, tapi bagus untuk konsistensi
  ConflictError,
  ValidationError,
  handleMongooseError,
} = require("../utils/errorHandler/errorHandler");
const { DEFAULT_PRODUCT_IMAGE } = require("../config/constants"); // Asumsikan Anda punya konstanta ini

/**
 * Membuat produk baru di database.
 * @param {object} productData - Data produk dari request body.
 * @param {object|null} file - Objek file yang diupload (dari Multer), jika ada.
 * @returns {Promise<object>} Objek produk yang baru dibuat.
 * @throws {ValidationError} Jika data tidak valid atau JSON string tidak benar.
 * @throws {ConflictError} Jika ada konflik data (misalnya, nama produk duplikat jika unik).
 */
const createProduct = async (productData, files) => {
  // Parameter kedua sekarang adalah 'files' (objek)
  let { name, description, price, discount_price, stock, category, brand } =
    productData;
  let images = []; // Array untuk menyimpan semua nama file gambar

  // Ambil nama file dari Multer untuk 'product_image'
  if (files && files.product_image && files.product_image.length > 0) {
    images.push(files.product_image[0].filename);
  }

  // Ambil nama file dari Multer untuk 'images' (array)
  if (files && files.images && files.images.length > 0) {
    files.images.forEach((f) => images.push(f.filename));
  }

  // Handle images array from productData if sent as JSON string (untuk URL yang sudah ada)
  if (productData.images && typeof productData.images === "string") {
    try {
      const parsedImages = JSON.parse(productData.images);
      if (Array.isArray(parsedImages)) {
        images = [...images, ...parsedImages]; // Gabungkan dengan gambar yang diupload via file
      } else {
        throw new ValidationError(
          "Images field must be a valid JSON array string.",
          [
            {
              param: "images",
              msg: "Images must be a valid JSON array string.",
            },
          ]
        );
      }
    } catch (e) {
      // Bersihkan SEMUA file yang diupload jika parsing JSON string gagal
      if (files.product_image)
        files.product_image.forEach((f) => fileHandler.deleteFile(f.path));
      if (files.images)
        files.images.forEach((f) => fileHandler.deleteFile(f.path));
      throw new ValidationError(
        "Images field must be a valid JSON array string.",
        [{ param: "images", msg: "Images must be a valid JSON array string." }]
      );
    }
  } else if (Array.isArray(productData.images)) {
    // Jika images langsung dikirim sebagai array (misal dari JSON body)
    images = [...images, ...productData.images];
  }

  // Filter out any empty strings/nulls and ensure uniqueness
  const uniqueImages = [...new Set(images.filter((img) => img))];

  // Jika setelah semua proses tidak ada gambar, gunakan gambar default
  if (uniqueImages.length === 0) {
    uniqueImages.push(DEFAULT_PRODUCT_IMAGE);
  }

  const newProduct = new Product({
    name,
    description,
    price,
    discount_price,
    stock,
    category,
    brand,
    images: uniqueImages,
  });

  try {
    const savedProduct = await newProduct.save();
    return savedProduct.toObject({ getters: true, virtuals: false });
  } catch (error) {
    // Bersihkan SEMUA file yang diunggah jika terjadi error database
    if (files.product_image)
      files.product_image.forEach((f) => fileHandler.deleteFile(f.path));
    if (files.images)
      files.images.forEach((f) => fileHandler.deleteFile(f.path));
    throw handleMongooseError(error);
  }
};

const getAllProducts = async (search) => {
  let queryFilter = {};

  if (search) {
    const searchRegex = new RegExp(search, "i");
    queryFilter = {
      $or: [{ name: { $regex: searchRegex } }],
    };
  }

  const cacheKey = `products:${JSON.stringify(queryFilter)}`;
  const cachedProducts = await cacheService.getCache(cacheKey);
  if (cachedProducts) {
    return JSON.parse(cachedProducts);
  }

  const products = await Product.find(queryFilter)
    .select("-password -__v")
    .sort({ createdAt: -1 });

  // Konversi Mongoose document ke plain object sebelum caching
  const productsToCache = products.map((product) =>
    product.toObject({ getters: true, virtuals: false })
  );
  await cacheService.setCache(cacheKey, JSON.stringify(productsToCache));

  return products;
};

const getProductById = async (id) => {
  const cacheKey = `user:${id}`;
  const cachedProduct = await cacheService.getCache(cacheKey);
  if (cachedProduct) {
    return JSON.parse(cachedProduct);
  }

  const product = await Product.findById(id).select("-password -__v");

  if (!product) {
    throw new NotFoundError(`User with ID: ${id} not found.`);
  }

  // Konversi Mongoose document ke plain object sebelum caching
  const productToCache = product.toObject({ getters: true, virtuals: false });
  await cacheService.setCache(cacheKey, JSON.stringify(productToCache));

  return product;
};

/**
 * Memperbarui data produk.
 * @param {string} id - ID produk yang akan diperbarui.
 * @param {object} updateData - Data yang akan diperbarui (name, description, price, etc.).
 * @param {object|null} files - Objek file yang diupload (dari Multer, bisa berupa req.files jika fields/array).
 * @returns {Promise<object>} Objek produk yang diperbarui.
 * @throws {NotFoundError} Jika produk tidak ditemukan.
 * @throws {ValidationError} Jika data tidak valid atau JSON string tidak benar.
 * @throws {ConflictError} Jika ada konflik data (misal: nama produk duplikat).
 */
const updateProduct = async (id, updateData, files = {}) => {
  let {
    name,
    description,
    price,
    discount_price,
    stock,
    category,
    brand,
    images,
  } = updateData;

  if (price !== undefined) {
    price = Number(price);
    if (isNaN(price)) {
      throw new ValidationError("Price must be a valid number.", [
        { param: "price", msg: "Price must be a valid number." },
      ]);
    }
  }
  if (discount_price !== undefined) {
    discount_price = Number(discount_price);
    if (isNaN(discount_price)) {
      throw new ValidationError("Discount price must be a valid number.", [
        {
          param: "discount_price",
          msg: "Discount price must be a valid number.",
        },
      ]);
    }
  }
  if (stock !== undefined) {
    stock = Number(stock);
    if (isNaN(stock)) {
      throw new ValidationError("Stock must be a valid number.", [
        { param: "stock", msg: "Stock must be a valid number." },
      ]);
    }
  }

  // Temukan produk yang ada
  const product = await Product.findById(id);

  if (!product) {
    // Bersihkan SEMUA file yang diupload jika produk tidak ditemukan
    if (files.product_image)
      files.product_image.forEach((f) =>
        fileHandler.deleteFile(f.path, "Error deleting uploaded product image:")
      );
    if (files.images)
      files.images.forEach((f) =>
        fileHandler.deleteFile(f.path, "Error deleting uploaded product image:")
      );
    throw new NotFoundError(`Product with ID: ${id} not found.`);
  }

  const fieldsToUpdate = {};
  let currentImages = product.images.map(String); // Ambil gambar yang sudah ada sebagai array string
  let newUploadedImages = []; // Untuk gambar yang baru diupload oleh Multer
  let imagesFromData = []; // Untuk URL gambar yang dikirim via body (JSON string atau array)

  // 1. Kumpulkan nama file dari Multer yang baru diupload
  if (files.product_image && files.product_image.length > 0) {
    newUploadedImages.push(files.product_image[0].filename);
  }
  if (files.images && files.images.length > 0) {
    files.images.forEach((f) => newUploadedImages.push(f.filename));
  }

  // 2. Kumpulkan URL gambar dari 'images' di updateData (bisa berupa JSON string atau array)
  if (images !== undefined) {
    if (typeof images === "string") {
      try {
        const parsedImages = JSON.parse(images);
        if (!Array.isArray(parsedImages)) {
          throw new ValidationError(
            "Images field must be a valid JSON array string.",
            [
              {
                param: "images",
                msg: "Images must be a valid JSON array string.",
              },
            ]
          );
        }
        imagesFromData = parsedImages.filter(
          (img) => typeof img === "string" && img.trim() !== ""
        );
      } catch (e) {
        // Bersihkan SEMUA file yang diupload jika parsing JSON string gagal
        if (files.product_image)
          files.product_image.forEach((f) =>
            fileHandler.deleteFile(
              f.path,
              "Error deleting uploaded product image on JSON parsing failure:"
            )
          );
        if (files.images)
          files.images.forEach((f) =>
            fileHandler.deleteFile(
              f.path,
              "Error deleting uploaded product image on JSON parsing failure:"
            )
          );
        throw new ValidationError(
          "Images field must be a valid JSON array string.",
          [
            {
              param: "images",
              msg: "Images must be a valid JSON array string.",
            },
          ]
        );
      }
    } else if (Array.isArray(images)) {
      imagesFromData = images.filter(
        (img) => typeof img === "string" && img.trim() !== ""
      );
    } else if (images === null || images === "") {
      // Ini berarti klien ingin menghapus SEMUA gambar (kecuali default jika tidak ada yang lain)
      currentImages = []; // Reset semua gambar yang ada
      // Hapus file fisik gambar produk yang ada (kecuali default)
      product.images.forEach((img) => {
        if (img !== DEFAULT_PRODUCT_IMAGE) {
          fileHandler.deleteFile(
            `./uploads/products/${img}`,
            "Error deleting old product image on explicit remove:"
          );
        }
      });
    }
  }

  // 3. Gabungkan semua sumber gambar (yang ada, yang baru diupload, yang dari data)
  // dan saring duplikat atau string kosong.
  let finalImages = [
    ...new Set(
      [...currentImages, ...newUploadedImages, ...imagesFromData].filter(
        (img) => img
      )
    ),
  ];

  // 4. Hapus gambar lama yang tidak lagi ada di finalImages DAN bukan gambar default
  const imagesToDelete = currentImages.filter(
    (img) => !finalImages.includes(img) && img !== DEFAULT_PRODUCT_IMAGE
  );

  imagesToDelete.forEach((img) => {
    fileHandler.deleteFile(
      `./uploads/products/${img}`,
      `Error deleting removed product image: ${img}`
    );
  });

  // 5. Jika setelah semua proses tidak ada gambar, pastikan ada default product image
  if (finalImages.length === 0) {
    finalImages.push(DEFAULT_PRODUCT_IMAGE);
  }

  // Isi fieldsToUpdate
  if (name !== undefined) fieldsToUpdate.name = name;
  if (description !== undefined) fieldsToUpdate.description = description;
  if (price !== undefined) fieldsToUpdate.price = price;
  if (discount_price !== undefined)
    fieldsToUpdate.discount_price = discount_price;
  if (stock !== undefined) fieldsToUpdate.stock = stock;
  if (category !== undefined) fieldsToUpdate.category = category;
  if (brand !== undefined) fieldsToUpdate.brand = brand;

  fieldsToUpdate.images = finalImages; // Update array gambar

  try {
    const updatedProduct = await Product.findByIdAndUpdate(id, fieldsToUpdate, {
      new: true,
      runValidators: true, // Jalankan validator schema Mongoose
    }).select("-__v"); // Jangan sertakan __v

    // Invalidate cache untuk produk ini dan mungkin semua produk
    await cacheService.deleteCache(`product:${id}`); // Hapus cache produk spesifik
    await cacheService.deleteCache("products:{}"); // Hapus cache semua produk (jika ada)

    return updatedProduct.toObject({ getters: true, virtuals: false });
  } catch (error) {
    // Bersihkan SEMUA file yang baru diunggah jika terjadi error database setelah Multer
    if (files.product_image)
      files.product_image.forEach((f) =>
        fileHandler.deleteFile(
          f.path,
          "Error deleting uploaded product image on DB error:"
        )
      );
    if (files.images)
      files.images.forEach((f) =>
        fileHandler.deleteFile(
          f.path,
          "Error deleting uploaded product image on DB error:"
        )
      );
    throw handleMongooseError(error); // Menggunakan handler error terpusat
  }
};

const deleteProduct = async (id) => {
  try {
    // 1. Temukan produk berdasarkan ID
    // Select the 'images' field to get the list of image filenames
    const product = await Product.findById(id).select("images");

    if (!product) {
      throw new NotFoundError(`Product with ID: ${id} not found.`);
    }

    // 2. Hapus file gambar fisik dari server
    // Iterate through all images associated with the product
    product.images.forEach((imageFilename) => {
      // Only delete if it's not the default product image
      if (imageFilename && imageFilename !== DEFAULT_PRODUCT_IMAGE) {
        fileHandler.deleteFile(
          `./uploads/products/${imageFilename}`, // Correct path for product images
          `Error deleting product image file: ${imageFilename}`
        );
      }
    });

    // 3. Hapus dokumen produk dari MongoDB
    await Product.findByIdAndDelete(id);

    // 4. Invalidate cache setelah penghapusan
    await cacheService.deleteCache(`product:${id}`); // Hapus cache produk spesifik
    await cacheService.deleteCache("products:{}"); // Hapus cache "all products"
  } catch (error) {
    // Handle Mongoose CastError for invalid ID format
    if (error.name === "CastError") {
      throw new NotFoundError(`Invalid product ID format: ${id}`); // Treat invalid ID format as Not Found
    }
    // Re-throw if it's an already handled custom error (like NotFoundError)
    if (error instanceof NotFoundError) {
      throw error;
    }
    // Handle other unexpected errors
    console.error("Error deleting product:", error);
    throw handleMongooseError(error); // Use central error handler for other Mongoose errors
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  // ... fungsi produk lainnya (getAllProducts, getProductById, updateProduct, deleteProduct)
};
