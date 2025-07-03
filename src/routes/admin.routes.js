import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT, authorizeAdmin } from "../middlewares/auth.middleware.js";
import {
  // Admin CRUD operations
  createShoe,
  updateShoe,
  deleteShoe,
  deleteShoeImage, // New controller function

  // Inventory Management
  updateShoeStock,
  bulkUpdateShoes,
  archiveShoe,

  // Read operations (admins need these too)
  getAllShoes,
  getShoeById,
  getShoesByCategory,
  getShoesByBrand,
  searchShoes,
  getShoesByFilters,
} from "../controller/Shoe.controller.js";
import { getAllUsers } from "../controller/User.controller.js";
const router = Router();

// Apply admin authentication to all routes
router.use(verifyJWT, authorizeAdmin);

// User management
router.route("/users").get(getAllUsers);

// ADMIN SHOE MANAGEMENT - Collection routes
router
  .route("/shoes")
  .post(upload.array("images", 5), createShoe) // Create new shoe
  .get(getAllShoes); // Admin view of all shoes

// Bulk operations
router.route("/shoes/bulk-update").patch(bulkUpdateShoes);

// Single shoe operations - Resource routes (follow RESTful conventions)
router
  .route("/shoes/:id")
  .get(getShoeById) // Get a specific shoe
  .put(upload.array("images", 5), updateShoe) // Update a specific shoe
  .delete(deleteShoe); // Delete a specific shoe

// Single image deletion - new endpoint
router.route("/shoes/:id/images/:imageIndex").delete(deleteShoeImage);

// Stock management
router.route("/shoes/:id/stock").patch(updateShoeStock);

// Archive (soft delete)
router.route("/shoes/:id/archive").patch(archiveShoe);

// Admin filtering routes for management
router.route("/shoes/category/:category").get(getShoesByCategory);
router.route("/shoes/brand/:brand").get(getShoesByBrand);
router.route("/shoes/search").get(searchShoes);
router.route("/shoes/filter").get(getShoesByFilters);

export default router;
