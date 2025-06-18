// src/controllers/productController.js
const productService = require("../services/productService");
const { validationResult } = require("express-validator"); // Untuk express-validator
const {
  ok,
  badRequest,
  created, // Gunakan ini untuk respons 201
  conflict,
  internalServerError,
  notFound,
} = require("../utils/response/responseFormatter");
const fileHandler = require("../utils/fileHandler/fileHandler"); // Untuk cleanup file
const {
  ValidationError,
  ConflictError,
  NotFoundError,
} = require("../utils/errorHandler/errorHandler");

/**
 * Membuat produk baru.
 * @param {object} req - Objek permintaan Express (termasuk req.body dan req.file).
 * @param {object} res - Objek respons Express.
 */
const createProductController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Bersihkan SEMUA file yang diupload jika validasi gagal
    // Periksa req.files.product_image dan req.files.images
    if (req.files) {
      if (req.files.product_image)
        req.files.product_image.forEach((f) =>
          fileHandler.deleteFile(
            f.path,
            "Error deleting uploaded product image on validation error:"
          )
        );
      if (req.files.images)
        req.files.images.forEach((f) =>
          fileHandler.deleteFile(
            f.path,
            "Error deleting uploaded product image on validation error:"
          )
        );
    }
    return badRequest(res, "Validation error", errors.array());
  }

  try {
    // Kirim req.files (objek) ke service
    const newProduct = await productService.createProduct(req.body, req.files);
    return created(res, "Product created successfully", newProduct);
  } catch (error) {
    // ... (Penanganan error yang sama)
    console.error("Error in createProductController:", error);
    if (error instanceof ValidationError) {
      return badRequest(res, error.message, error.details);
    }
    if (error instanceof ConflictError) {
      return conflict(res, error.message, error.details);
    }
    if (error.message && error.message.includes("Hanya file gambar")) {
      return badRequest(res, error.message);
    }
    return internalServerError(res, "Internal server error.");
  }
};

const findProducts = async (req, res) => { // This function should now handle filter/sort
  try {
    // Pass req.query directly to the service
    const products = await productService.getAllProducts(req.query);
    return ok(res, "Get all products successfully", products);
  } catch (error) {
    console.error("Error in findProducts:", error); // Corrected typo from "findProducs"
    return internalServerError(res, "Internal server error.");
  }
};

const findProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await productService.getProductById(id);
    return ok(res, `Get product by ID: ${id} successfully`, product);
  } catch (error) {
    console.error("Error in findproductById:", error);
    if (error instanceof NotFoundError) {
      return notFound(res, error.message);
    }
    if (error.name === "CastError") {
      return badRequest(res, `Invalid product ID format: ${req.params.id}`);
    }
    return internalServerError(res, "Internal server error.");
  }
};

const updateProduct = async (req, res) => { // Renamed for clarity as this is a controller
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    if (req.files) { // Check req.files, not req.file
      if (req.files.product_image)
        req.files.product_image.forEach((f) =>
          fileHandler.deleteFile(f.path, "Error deleting uploaded product image on validation error:")
        );
      if (req.files.images)
        req.files.images.forEach((f) =>
          fileHandler.deleteFile(f.path, "Error deleting uploaded product image on validation error:")
        );
    }
    return badRequest(res, "Validation error", errors.array());
  }

  const { id } = req.params;
  try {
    // Pass req.files (plural) because your Multer route uses .fields()
    const updatedProduct = await productService.updateProduct(id, req.body, req.files);
    return ok(res, `Product with ID: ${id} updated successfully`, updatedProduct);
  } catch (error) {
    console.error("Error in updateProductController:", error);
    // Now these instanceof checks will work correctly
    if (error instanceof NotFoundError) {
      return notFound(res, error.message); // notFound is a response formatter function
    }
    if (error instanceof ValidationError) {
      return badRequest(res, error.message, error.details);
    }
    if (error instanceof ConflictError) {
      return conflict(res, error.message, error.details);
    }
    if (error.name === "CastError") {
      return badRequest(res, `Invalid product ID format: ${req.params.id}`);
    }
    // Handle Multer fileFilter error if it comes through (though handleValidationErrors should catch it)
    if (error.message && error.message.includes("Hanya file gambar")) {
      return badRequest(res, error.message);
    }
    return internalServerError(res, "Internal server error.");
  }
};

/**
 * Delete a user by ID.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    await productService.deleteProduct(id);
    return ok(res, "Product deleted successfully");
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    if (error instanceof NotFoundError) {
      return notFound(res, error.message);
    }
    if (error.name === "CastError") {
      return badRequest(res, `Invalid Product ID format: ${req.params.id}`);
    }
    return internalServerError(res, "Internal server error.");
  }
};

module.exports = {
  createProductController,
  findProducts,
  findProductById,
  updateProduct,
  deleteProduct,
  // ... controller lainnya (findProducts, findProductById, updateProduct, deleteProduct)
};
