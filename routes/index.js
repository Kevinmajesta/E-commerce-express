const express = require("express");

const verifyToken = require("../middlewares/auth");

const router = express.Router();

const registerController = require("../controllers/RegisterController");
const loginController = require("../controllers/LoginController");
const userController = require("../controllers/UserController");
const productController = require("../controllers/ProductController");

const { validateRegister, validateLogin } = require("../utils/validators/auth");
const { validateProduct } = require("../utils/validators/product");
const { validateUser } = require("../utils/validators/user");

const { configureMulter } = require("../middlewares/upload");
const { handleValidationErrors } = require("../middlewares/validationMiddleware");

const uploadAvatar = configureMulter("avatars", 5);
const uploadProductImages = configureMulter("products", 10);

router.post(
  "/register",
  uploadAvatar.single("profile_picture"),
  validateRegister,
  handleValidationErrors,
  registerController.register
);

router.post("/login", validateLogin, handleValidationErrors, loginController.login);

router.get("/admin/users", verifyToken, userController.findUsers);

router.get("/admin/users/:id", verifyToken, userController.findUserById);

router.put(
  "/admin/users/:id",
  verifyToken,
  uploadAvatar.single("profile_picture"),
  validateUser,
  handleValidationErrors,
  userController.updateUser
);

router.delete("/admin/users/:id", verifyToken, userController.deleteUser);

router.post(
  "/admin/products",
  verifyToken,
  uploadProductImages.fields([
    { name: "product_image", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  validateProduct,
  handleValidationErrors,
  productController.createProductController
);

router.get(
  "/admin/products",
  verifyToken,
  productController.findProducts
);
router.get(
  "/admin/products/:id",
  verifyToken,
  productController.findProductById
);

router.put(
  "/admin/products/:id",
  verifyToken,
  uploadProductImages.fields([
    { name: "product_image", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  validateProduct,
  handleValidationErrors,
  productController.updateProduct
);

router.delete("/admin/products/:id", verifyToken, productController.deleteProduct);
module.exports = router;