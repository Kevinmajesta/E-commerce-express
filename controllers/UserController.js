// Import external libraries
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const fs = require("fs"); // For file system operations

// Import Mongoose Model
const User = require("../models/user.js");

// Import utility functions (response formatter, redis client)
const {
  ok,
  badRequest,
  notFound,
  conflict,
  internalServerError,
} = require("../utils/response/responseFormatter");
const redisClient = require("../database/redisClient");

// --- Helper Functions (Internal to this module) ---

// Helper to safely parse JSON string from form-data
const parseAddressIfString = (addressString, req, res) => {
  if (addressString && typeof addressString === "string") {
    try {
      return JSON.parse(addressString);
    } catch (e) {
      // Clean up uploaded file if parsing fails
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting uploaded file:", err);
        });
      }
      badRequest(res, "Validation error", [{ param: "address", msg: "Address must be a valid JSON string." }]);
      // Throw an error to stop execution in the main controller logic
      throw new Error("Invalid address JSON format");
    }
  }
  return addressString; // Return as is if not a string or empty
};

// Helper to delete physical file from server
const deleteFileFromServer = (filePath, errorMessage) => {
  if (filePath) {
    fs.unlink(filePath, (err) => {
      if (err) console.error(errorMessage || "Error deleting file:", err);
    });
  }
};

// Helper to invalidate Redis cache for a specific user and all users
const invalidateUserCache = async (userId) => {
  try {
    await redisClient.del(`user:${userId}`);
    console.log(`Cleared cache for user ID: ${userId}`);
    // Invalidate the 'all users' cache as well
    await redisClient.del("users:{}"); // Assuming this is the key for non-filtered users
    console.log('Invalidated "all users" cache.');
  } catch (cacheError) {
    console.error("Redis cache invalidation error:", cacheError);
  }
};

// --- Controller Functions ---

/**
 * Get all users with optional search and Redis caching.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
const findUsers = async (req, res) => {
  try {
    const { search } = req.query;
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
    const CACHE_EXPIRATION_SECONDS = 3600; // 1 hour

    // Attempt to fetch from Redis cache
    try {
      const cachedUsers = await redisClient.get(cacheKey);
      if (cachedUsers) {
        console.log("Serving from Redis cache...");
        return ok(res, "Get all users successfully (from cache)", JSON.parse(cachedUsers));
      }
    } catch (cacheError) {
      console.error("Redis cache lookup error:", cacheError);
    }

    // Fetch from database if not in cache
    console.log("Serving from database...");
    const users = await User.find(queryFilter)
      .select("-password -__v")
      .sort({ createdAt: -1 });

    // Store in Redis cache
    try {
      const usersToCache = users.map((user) =>
        user.toObject({ getters: true, virtuals: false })
      );
      await redisClient.setEx(
        cacheKey,
        CACHE_EXPIRATION_SECONDS,
        JSON.stringify(usersToCache)
      );
      console.log(`Data cached in Redis for key: ${cacheKey}`);
    } catch (cacheError) {
      console.error("Redis cache set error:", cacheError);
    }

    return ok(res, "Get all users successfully", users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return internalServerError(res, "Internal server error.");
  }
};

/**
 * Get a single user by ID with Redis caching.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
const findUserById = async (req, res) => {
  const { id } = req.params;
  const cacheKey = `user:${id}`;
  const CACHE_EXPIRATION_SECONDS = 3600; // 1 hour

  try {
    // Attempt to fetch from Redis cache
    try {
      const cachedUser = await redisClient.get(cacheKey);
      if (cachedUser) {
        console.log(`Serving user ${id} from Redis cache...`);
        return ok(res, `Get user by ID: ${id} successfully (from cache)`, JSON.parse(cachedUser));
      }
    } catch (cacheError) {
      console.error(`Redis cache lookup error for user ${id}:`, cacheError);
    }

    // Fetch from database if not in cache
    console.log(`Serving user ${id} from database...`);
    const user = await User.findById(id).select("-password -__v");

    if (!user) {
      return notFound(res, `User with ID: ${id} not found.`);
    }

    // Store in Redis cache
    try {
      const userToCache = user.toObject({ getters: true, virtuals: false });
      await redisClient.setEx(
        cacheKey,
        CACHE_EXPIRATION_SECONDS,
        JSON.stringify(userToCache)
      );
      console.log(`Data for user ${id} cached in Redis.`);
    } catch (cacheError) {
      console.error(`Redis cache set error for user ${id}:`, cacheError);
    }

    return ok(res, `Get user by ID: ${id} successfully`, user);
  } catch (error) {
    if (error.name === "CastError") {
      return badRequest(res, `Invalid user ID format: ${req.params.id}`);
    }
    console.error("Error fetching user by ID:", error);
    return internalServerError(res, "Internal server error.");
  }
};

/**
 * Update user profile by ID, including password and profile picture.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
const updateUser = async (req, res) => {
  const { id } = req.params;
  const errors = validationResult(req); // Express-validator errors
  let { username, name, email, password, phone_number, address, role } = req.body;

  // Cleanup file if validation fails early
  if (!errors.isEmpty() && req.file) {
    deleteFileFromServer(req.file.path, "Error deleting uploaded file on validation error:");
    return badRequest(res, "Validation error", errors.array());
  }

  try {
    // Parse address string if sent via form-data
    address = parseAddressIfString(address, req, res);

    const user = await User.findById(id).select("+password"); // Need password for comparison

    if (!user) {
      // Cleanup file if user not found
      if (req.file) {
        deleteFileFromServer(req.file.path, "Error deleting uploaded file on user not found:");
      }
      return notFound(res, `User with ID: ${id} not found.`);
    }

    const updateData = {};

    // Conditionally update fields
    if (username) updateData.username = username.toLowerCase();
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (phone_number) updateData.phone_number = phone_number;
    if (address) updateData.address = address;
    if (role) updateData.role = role;

    // Handle password update
    if (password) {
      const isSamePassword = await bcrypt.compare(password, user.password);
      if (!isSamePassword) {
        updateData.password = await bcrypt.hash(password, 10);
      }
    }

    // Handle profile picture update
    if (req.file) { // New file uploaded
      if (user.profile_picture && user.profile_picture !== "default-avatar.png") {
        deleteFileFromServer(`./uploads/avatars/${user.profile_picture}`, "Error deleting old profile picture:");
      }
      updateData.profile_picture = req.file.filename;
    } else if (req.body.profile_picture === null || req.body.profile_picture === "") { // Explicitly remove
      if (user.profile_picture && user.profile_picture !== "default-avatar.png") {
        deleteFileFromServer(`./uploads/avatars/${user.profile_picture}`, "Error deleting old profile picture on explicit remove:");
      }
      updateData.profile_picture = "default-avatar.png";
    }

    // Perform the update
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -__v");

    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    // Invalidate Redis cache for this user and all users after update
    await invalidateUserCache(id);

    return ok(res, `User with ID: ${id} updated successfully`, userResponse);
  } catch (error) {
    // Cleanup file if DB error occurs after Multer upload
    if (req.file) {
      deleteFileFromServer(req.file.path, "Error deleting uploaded file on DB error:");
    }
    console.error("Error updating user profile:", error);

    // Consolidated error handling for Mongoose/DB issues
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        param: err.path,
        msg: err.message,
      }));
      return badRequest(res, error.message, validationErrors);
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
      return conflict(res, message, [{ param: field, msg: message }]);
    }
    if (error.name === "CastError") {
      return badRequest(res, `Invalid user ID format: ${req.params.id}`);
    }

    return internalServerError(res, "Internal server error.");
  }
};

/**
 * Delete a user by ID, including their profile picture and Redis cache.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return notFound(res, `User with ID: ${id} not found.`);
    }

    // Delete the physical profile picture file
    if (user.profile_picture && user.profile_picture !== "default-avatar.png") {
      deleteFileFromServer(`./uploads/avatars/${user.profile_picture}`, "Error deleting user's profile picture file:");
    }

    // Delete the user document from MongoDB
    await User.findByIdAndDelete(id);

    // Invalidate Redis cache for this user and all users after deletion
    await invalidateUserCache(id);

    return ok(res, "User deleted successfully");
  } catch (error) {
    if (error.name === "CastError") {
      return badRequest(res, `Invalid user ID format: ${req.params.id}`);
    }
    console.error("Error deleting user:", error);
    return internalServerError(res, "Internal server error.");
  }
};

module.exports = { findUsers, findUserById, updateUser, deleteUser };