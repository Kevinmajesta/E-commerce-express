// utils/responseFormatter.js

/**
 * Fungsi untuk mengirim respons API yang konsisten dengan tambahan 'code'.
 * @param {object} res - Objek respons Express.
 * @param {number} statusCode - Kode status HTTP (e.g., 200, 201, 400, 401, 404, 500).
 * @param {boolean} success - Status keberhasilan operasi (true/false).
 * @param {string} message - Pesan singkat yang menjelaskan respons.
 * @param {object|array} [data={}] - Data yang akan dikirim (opsional).
 * @param {array} [errors=[]] - Array error validasi atau error lain (opsional, hanya untuk success: false).
 * @returns {object} Objek respons JSON.
 */
const sendResponse = (res, statusCode, success, message, data = {}, errors = []) => {
  const response = {
    // Tambahkan properti 'code' di sini
    code: statusCode, // 'code' akan berisi nilai statusCode HTTP
    success: success,
    message: message,
  };

  if (Object.keys(data).length > 0 || Array.isArray(data)) {
    response.data = data;
  }

  if (errors.length > 0) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

// Fungsi-fungsi pembantu lainnya tidak perlu diubah,
// karena mereka memanggil sendResponse yang sudah dimodifikasi.
const ok = (res, message = 'Success', data = {}) => {
  return sendResponse(res, 200, true, message, data);
};

const created = (res, message = 'Resource created successfully', data = {}) => {
  return sendResponse(res, 201, true, message, data);
};

const badRequest = (res, message = 'Bad Request', errors = []) => {
  return sendResponse(res, 400, false, message, {}, errors);
};

const unauthorized = (res, message = 'Unauthorized', errors = []) => {
  return sendResponse(res, 401, false, message, {}, errors);
};

const forbidden = (res, message = 'Forbidden', errors = []) => {
  return sendResponse(res, 403, false, message, {}, errors);
};

const notFound = (res, message = 'Not Found', errors = []) => {
  return sendResponse(res, 404, false, message, {}, errors);
};

const conflict = (res, message = 'Conflict', errors = []) => {
  return sendResponse(res, 409, false, message, {}, errors);
};

const internalServerError = (res, message = 'Internal Server Error', errors = []) => {
  const errorDetails = process.env.NODE_ENV === 'production' ? [] : errors; // Tetap sertakan error details jika ada
  return sendResponse(res, 500, false, message, {}, errorDetails);
};

module.exports = {
  sendResponse,
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internalServerError
};