// routes/index.js (or whatever your main router file is named, e.g., authRoutes.js)

// Import express
const express = require("express");

const verifyToken = require("../middlewares/auth");
// Init express router
const router = express.Router();

// Import register and login controllers
const registerController = require("../controllers/RegisterController"); // Or wherever your register controller is
const loginController = require("../controllers/LoginController");
const userController = require("../controllers/UserController");

// Import validation middleware
const { validateRegister, validateLogin } = require("../utils/validators/auth"); // Assuming both are in auth.js

// Import Multer upload middleware
const upload = require("../middlewares/upload"); // <--- Make sure this path is correct

// Define route for register
// Add upload.single() middleware BEFORE validation
router.post(
  "/register",
  upload.single("profile_picture"),
  validateRegister,
  registerController.register
);

// Define route for login
router.post("/login", validateLogin, loginController.login);
router.get("/admin/users", verifyToken, userController.findUsers);
router.get("/admin/users/:id", verifyToken, userController.findUserById);
router.put(
  "/admin/users/:id",
  verifyToken,
  upload.single("profile_picture"), // 2. Multer parses form-data and populates req.body
  userController.updateUser // 4. Controller receives parsed body and validated data
);
router.delete("/admin/users/:id", verifyToken, userController.deleteUser);

// Export router
module.exports = router;
