// src/utils/fileHandler.js
const fs = require("fs");

/**
 * Menghapus file fisik dari server.
 * @param {string} filePath - Path lengkap ke file yang akan dihapus.
 * @param {string} [errorMessage] - Pesan error kustom jika penghapusan gagal.
 */
const deleteFile = (filePath, errorMessage) => {
  if (filePath) {
    fs.unlink(filePath, (err) => {
      if (err)
        console.error(
          errorMessage || "Error deleting file from server:",
          err
        );
    });
  }
};

module.exports = { deleteFile };