import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  // User authentication controllers only
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  forgotPassword,
  updatePassword,
  updateUserInfo,
  getUserProfile,
} from "../controller/User.controller.js";

import {
  // Import shoe controllers
  getAllShoes,
  getShoeById,
  getShoesByCategory,
  getShoesByBrand,
  searchShoes,
  getFeaturedShoes,
  getShoesOnSale,
  getShoesByFilters,
  getSimilarShoes,
  addShoeToWishlist,
  rateOrReviewShoe,
  createShoe, // Add this for testing
} from "../controller/Shoe.controller.js";

const router = Router();

// USER AUTHENTICATION ROUTES
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/password/forgot").post(forgotPassword);
router.route("/password/reset/:resetToken").put(resetPassword);
router.route("/update/password").patch(verifyJWT, updatePassword);
router.route("/update-info").put(verifyJWT, updateUserInfo);
router.route("/profile").get(verifyJWT, getUserProfile);

// PUBLIC SHOE BROWSING ROUTES
router.route("/shoes").get(getAllShoes);

// TEMPORARY TEST ROUTE FOR DEBUGGING (REMOVE IN PRODUCTION)
router.route("/test-shoe-upload").post(upload.array("images", 5), createShoe);

router.route("/shoes/:id").get(getShoeById);

router.route("/shoes/category/:category").get(getShoesByCategory);
router.route("/shoes/brand/:brand").get(getShoesByBrand);
router.route("/shoes/search").get(searchShoes);
router.route("/shoes/featured").get(getFeaturedShoes);
router.route("/shoes/sale").get(getShoesOnSale);
router.route("/shoes/filter").get(getShoesByFilters);
router.route("/shoes/:id/similar").get(getSimilarShoes);

// AUTHENTICATED USER ACTIONS
router.route("/shoes/:id/wishlist").post(verifyJWT, addShoeToWishlist);
router.route("/shoes/:id/review").post(verifyJWT, rateOrReviewShoe);

export default router;
