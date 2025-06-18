// src/services/userService.js
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const cacheService = require("./cacheService");
const fileHandler = require("../utils/fileHandler/fileHandler");
const {
  NotFoundError,
  ConflictError,
  ValidationError,
  handleMongooseError,
} = require("../utils/errorHandler/errorHandler");
const { DEFAULT_AVATAR } = require("../config/constants");

/**
 * Memastikan string alamat adalah JSON yang valid jika ada dan berupa string.
 * @param {string|object} addressString - String alamat JSON atau objek.
 * @returns {object} Objek alamat yang di-parse.
 * @throws {ValidationError} Jika string alamat bukan JSON yang valid.
 */
const parseAddressIfString = (addressString) => {
  if (addressString && typeof addressString === "string") {
    try {
      return JSON.parse(addressString);
    } catch (e) {
      throw new ValidationError("Address must be a valid JSON string.", [
        { param: "address", msg: "Address must be a valid JSON string." },
      ]);
    }
  }
  return addressString; // Kembalikan apa adanya jika bukan string atau kosong
};

/**
 * Mengambil semua pengguna dari database, dengan dukungan pencarian dan caching.
 * @param {string} [search] - String pencarian untuk username, nama, atau email.
 * @returns {Promise<Array>} Array objek pengguna.
 */
const getAllUsers = async (search) => {
  let queryFilter = {};

  if (search) {
    const searchRegex = new RegExp(search, "i");
    queryFilter = {
      $or: [
        { username: { $regex: searchRegex } },
        { name: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
      ],
    };
  }

  const cacheKey = `users:${JSON.stringify(queryFilter)}`;
  const cachedUsers = await cacheService.getCache(cacheKey);
  if (cachedUsers) {
    return JSON.parse(cachedUsers);
  }

  const users = await User.find(queryFilter)
    .select("-password -__v")
    .sort({ createdAt: -1 });

  // Konversi Mongoose document ke plain object sebelum caching
  const usersToCache = users.map((user) =>
    user.toObject({ getters: true, virtuals: false })
  );
  await cacheService.setCache(cacheKey, JSON.stringify(usersToCache));

  return users;
};

/**
 * Mengambil pengguna berdasarkan ID, dengan caching.
 * @param {string} id - ID pengguna.
 * @returns {Promise<object>} Objek pengguna.
 * @throws {NotFoundError} Jika pengguna tidak ditemukan.
 */
const getUserById = async (id) => {
  const cacheKey = `user:${id}`;
  const cachedUser = await cacheService.getCache(cacheKey);
  if (cachedUser) {
    return JSON.parse(cachedUser);
  }

  const user = await User.findById(id).select("-password -__v");

  if (!user) {
    throw new NotFoundError(`User with ID: ${id} not found.`);
  }

  // Konversi Mongoose document ke plain object sebelum caching
  const userToCache = user.toObject({ getters: true, virtuals: false });
  await cacheService.setCache(cacheKey, JSON.stringify(userToCache));

  return user;
};

/**
 * Memperbarui profil pengguna.
 * @param {string} id - ID pengguna yang akan diperbarui.
 * @param {object} updateData - Data yang akan diperbarui (username, name, email, password, etc.).
 * @param {object} [file] - Objek file yang diupload (dari Multer).
 * @returns {Promise<object>} Objek pengguna yang diperbarui.
 * @throws {NotFoundError} Jika pengguna tidak ditemukan.
 * @throws {ValidationError} Jika data tidak valid.
 * @throws {ConflictError} Jika ada konflik data (misal: email/username duplikat).
 */
const updateUser = async (id, updateData, file) => {
  let { username, name, email, password, phone_number, address, role } =
    updateData;

  const user = await User.findById(id).select("+password +profile_picture"); // Select profile_picture juga untuk path lama

  if (!user) {
    if (file) fileHandler.deleteFile(file.path, "Error deleting uploaded file:");
    throw new NotFoundError(`User with ID: ${id} not found.`);
  }

  // Parse address jika string, dan tangani error
  try {
    address = parseAddressIfString(address);
  } catch (error) {
    if (file) fileHandler.deleteFile(file.path, "Error deleting uploaded file:");
    throw error; // Melemparkan ValidationError yang sudah dibuat
  }

  const fieldsToUpdate = {};

  if (username !== undefined) fieldsToUpdate.username = username.toLowerCase();
  if (name !== undefined) fieldsToUpdate.name = name;
  if (email !== undefined) fieldsToUpdate.email = email.toLowerCase();
  if (phone_number !== undefined)
    fieldsToUpdate.phone_number = phone_number;
  if (address !== undefined) fieldsToUpdate.address = address;
  if (role !== undefined) fieldsToUpdate.role = role;

  // Handle password update
  if (password) {
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (!isSamePassword) {
      fieldsToUpdate.password = await bcrypt.hash(password, 10);
    }
  }

  // Handle profile picture update
  if (file) {
    // New file uploaded
    if (user.profile_picture && user.profile_picture !== DEFAULT_AVATAR) {
      fileHandler.deleteFile(
        `./uploads/avatars/${user.profile_picture}`,
        "Error deleting old profile picture:"
      );
    }
    fieldsToUpdate.profile_picture = file.filename;
  } else if (
    updateData.profile_picture === null ||
    updateData.profile_picture === ""
  ) {
    // Explicitly remove profile picture
    if (user.profile_picture && user.profile_picture !== DEFAULT_AVATAR) {
      fileHandler.deleteFile(
        `./uploads/avatars/${user.profile_picture}`,
        "Error deleting old profile picture on explicit remove:"
      );
    }
    fieldsToUpdate.profile_picture = DEFAULT_AVATAR;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    }).select("-password -__v");

    // Invalidate cache setelah update
    await cacheService.invalidateUserCache(id);

    return updatedUser.toObject({ getters: true, virtuals: false });
  } catch (error) {
    if (file) fileHandler.deleteFile(file.path, "Error deleting uploaded file:");
    throw handleMongooseError(error); // Menggunakan handler error terpusat
  }
};

/**
 * Menghapus pengguna dari database.
 * @param {string} id - ID pengguna yang akan dihapus.
 * @returns {Promise<void>}
 * @throws {NotFoundError} Jika pengguna tidak ditemukan.
 */
const deleteUser = async (id) => {
  const user = await User.findById(id).select("profile_picture"); // Hanya ambil profil picture

  if (!user) {
    throw new NotFoundError(`User with ID: ${id} not found.`);
  }

  // Hapus file gambar profil fisik
  if (user.profile_picture && user.profile_picture !== DEFAULT_AVATAR) {
    fileHandler.deleteFile(
      `./uploads/avatars/${user.profile_picture}`,
      "Error deleting user's profile picture file:"
    );
  }

  // Hapus dokumen pengguna dari MongoDB
  await User.findByIdAndDelete(id);

  // Invalidate cache setelah penghapusan
  await cacheService.invalidateUserCache(id);
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};