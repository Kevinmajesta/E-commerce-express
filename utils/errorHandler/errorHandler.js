// src/utils/errorHandler.js

// Definisi custom error untuk penanganan yang lebih spesifik di controller/service
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

class ConflictError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ConflictError";
    this.statusCode = 409;
    this.details = details;
  }
}

class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    this.details = details;
  }
}

/**
 * Mengurai dan mengkonversi error MongoDB/Mongoose ke format yang lebih konsisten.
 * @param {Error} error - Objek error yang ditangkap.
 * @returns {Object} Objek error yang diproses dengan nama custom error dan detail yang relevan.
 */
const handleMongooseError = (error) => {
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => ({
      param: err.path,
      msg: err.message,
    }));
    return new ValidationError(error.message, errors);
  }
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const message = `${
      field.charAt(0).toUpperCase() + field.slice(1)
    } already exists.`;
    return new ConflictError(message, [{ param: field, msg: message }]);
  }
  if (error.name === "CastError") {
    return new ValidationError(`Invalid ID format: ${error.value}`, [
      { param: error.path, msg: `Invalid ${error.path}` },
    ]);
  }
  // Untuk error lain yang tidak spesifik, lemparkan kembali atau bungkus
  return error;
};

module.exports = {
  NotFoundError,
  ConflictError,
  ValidationError,
  handleMongooseError,
};