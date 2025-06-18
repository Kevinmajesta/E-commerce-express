// src/services/cacheService.js
const redisClient = require("../database/redisClient");
const { CACHE_EXPIRATION_SECONDS } = require("../config/constants");

/**
 * Mendapatkan data dari cache Redis.
 * @param {string} key - Kunci cache.
 * @returns {Promise<string|null>} Data dari cache atau null jika tidak ada/error.
 */
const getCache = async (key) => {
  try {
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      console.log(`Serving from Redis cache for key: ${key}`);
      return cachedData;
    }
  } catch (cacheError) {
    console.error(`Redis cache lookup error for key ${key}:`, cacheError);
  }
  return null;
};

/**
 * Menyimpan data ke cache Redis.
 * @param {string} key - Kunci cache.
 * @param {string} value - Data yang akan disimpan (harus dalam bentuk string).
 * @param {number} [expiresInSeconds=CACHE_EXPIRATION_SECONDS] - Waktu kadaluarsa dalam detik.
 * @returns {Promise<void>}
 */
const setCache = async (key, value, expiresInSeconds = CACHE_EXPIRATION_SECONDS) => {
  try {
    await redisClient.setEx(key, expiresInSeconds, value);
    console.log(`Data cached in Redis for key: ${key}`);
  } catch (cacheError) {
    console.error(`Redis cache set error for key ${key}:`, cacheError);
  }
};

/**
 * Menghapus satu atau lebih kunci dari cache Redis.
 * @param {string|string[]} keys - Kunci atau array kunci yang akan dihapus.
 * @returns {Promise<void>}
 */
const deleteCache = async (...keys) => {
  try {
    for (const key of keys) {
      await redisClient.del(key);
      console.log(`Cleared cache for key: ${key}`);
    }
  } catch (cacheError) {
    console.error("Redis cache deletion error:", cacheError);
  }
};

/**
 * Menginvalidasi cache untuk pengguna tertentu dan daftar semua pengguna.
 * @param {string} userId - ID pengguna yang cachenya akan diinvalidasi.
 */
const invalidateUserCache = async (userId) => {
  await deleteCache(`user:${userId}`, "users:{}"); // Invalidate cache specific user & all users
  // Jika ada cache dengan filter lain (misal: users:{"role":"admin"}), Anda mungkin perlu strategi yang lebih canggih
  // seperti tag atau prefix untuk invalidasi massal yang lebih cerdas.
};

module.exports = {
  getCache,
  setCache,
  deleteCache,
  invalidateUserCache,
};