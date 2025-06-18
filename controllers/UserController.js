// src/controllers/userController.js
const userService = require("../services/userService");
const {
  ok,
  notFound,
  badRequest,
  conflict,
  internalServerError,
} = require("../utils/response/responseFormatter");
const {
  NotFoundError,
  ValidationError,
  ConflictError,
} = require("../utils/errorHandler/errorHandler");

/**
 * Get all users with optional search.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
const findUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const users = await userService.getAllUsers(search);
    return ok(res, "Get all users successfully", users);
  } catch (error) {
    console.error("Error in findUsers:", error);
    return internalServerError(res, "Internal server error.");
  }
};

/**
 * Get a single user by ID.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
const findUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await userService.getUserById(id);
    return ok(res, `Get user by ID: ${id} successfully`, user);
  } catch (error) {
    console.error("Error in findUserById:", error);
    if (error instanceof NotFoundError) {
      return notFound(res, error.message);
    }
    if (error.name === "CastError") {
      return badRequest(res, `Invalid user ID format: ${req.params.id}`);
    }
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
  try {
    const updatedUser = await userService.updateUser(id, req.body, req.file);
    return ok(res, `User with ID: ${id} updated successfully`, updatedUser);
  } catch (error) {
    console.error("Error in updateUser:", error);
    if (error instanceof NotFoundError) {
      return notFound(res, error.message);
    }
    if (error instanceof ValidationError) {
      return badRequest(res, error.message, error.details);
    }
    if (error instanceof ConflictError) {
      return conflict(res, error.message, error.details);
    }
    if (error.name === "CastError") {
      return badRequest(res, `Invalid user ID format: ${req.params.id}`);
    }
    return internalServerError(res, "Internal server error.");
  }
};

/**
 * Delete a user by ID.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await userService.deleteUser(id);
    return ok(res, "User deleted successfully");
  } catch (error) {
    console.error("Error in deleteUser:", error);
    if (error instanceof NotFoundError) {
      return notFound(res, error.message);
    }
    if (error.name === "CastError") {
      return badRequest(res, `Invalid user ID format: ${req.params.id}`);
    }
    return internalServerError(res, "Internal server error.");
  }
};

module.exports = { findUsers, findUserById, updateUser, deleteUser };