// src/middlewares/validationMiddleware.js
const { validationResult } = require("express-validator");
const { badRequest } = require("../utils/response/responseFormatter");
const fileHandler = require("../utils/fileHandler/fileHandler");

/**
 * Middleware untuk menangani hasil validasi dari express-validator.
 * Jika ada error validasi, ia akan mengirim response 400 dan menghapus file yang diupload (jika ada).
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Bersihkan file yang diunggah jika validasi gagal
    if (req.file) {
      fileHandler.deleteFile(
        req.file.path,
        "Error deleting uploaded file on validation error:"
      );
    }
    return badRequest(res, "Validation error", errors.array());
  }
  next();
};

module.exports = {
  handleValidationErrors,
};