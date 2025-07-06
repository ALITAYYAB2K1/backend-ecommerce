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
  getUserWishlist,
  removeFromWishlist,
  getUserReviews,
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
  getShoeReviews,
  deleteShoeReview,
  createShoe, // Add this for testing
} from "../controller/Shoe.controller.js";

import {
  // Import cart controllers
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
} from "../controller/Cart.controller.js";

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

// USER WISHLIST AND REVIEWS
router.route("/wishlist").get(verifyJWT, getUserWishlist);
router.route("/reviews").get(verifyJWT, getUserReviews);

// USER CART MANAGEMENT
router.route("/cart").get(verifyJWT, getCart);
router.route("/cart").post(verifyJWT, addToCart);
router.route("/cart").put(verifyJWT, updateCartItem);
router.route("/cart").delete(verifyJWT, clearCart);
router.route("/cart/remove").post(verifyJWT, removeFromCart);
router.route("/cart/summary").get(verifyJWT, getCartSummary);

// PUBLIC SHOE BROWSING ROUTES
router.route("/shoes").get(getAllShoes);

// Specific routes MUST come before parameterized routes
router.route("/shoes/featured").get(getFeaturedShoes);
router.route("/shoes/sale").get(getShoesOnSale);
router.route("/shoes/search").get(searchShoes);
router.route("/shoes/filter").get(getShoesByFilters);
router.route("/shoes/category/:category").get(getShoesByCategory);
router.route("/shoes/brand/:brand").get(getShoesByBrand);

// Parameterized routes come last
router.route("/shoes/:id").get(getShoeById);
router.route("/shoes/:id/similar").get(getSimilarShoes);
router.route("/shoes/:id/reviews").get(getShoeReviews);

// AUTHENTICATED USER ACTIONS
router.route("/shoes/:id/wishlist").post(verifyJWT, addShoeToWishlist);
router.route("/shoes/:id/wishlist").delete(verifyJWT, removeFromWishlist);
router.route("/shoes/:id/review").post(verifyJWT, rateOrReviewShoe);
router.route("/shoes/:id/review").delete(verifyJWT, deleteShoeReview);

export default router;
