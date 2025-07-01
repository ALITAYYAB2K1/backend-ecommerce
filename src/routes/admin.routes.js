import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT, authorizeAdmin } from "../middlewares/auth.middleware.js";
import {
  // Admin CRUD operations
  createShoe,
  updateShoe,
  deleteShoe,

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
router.route("/users").get(getAllUsers);
// ADMIN SHOE MANAGEMENT
router
  .route("/shoes")
  .post(upload.array("images", 5), createShoe) // Create new shoe
  .get(getAllShoes); // Admin view of all shoes (might include hidden products)

// Bulk operations
router.route("/shoes/bulk-update").patch(bulkUpdateShoes);

// Single shoe operations
router
  .route("/shoes/:id")
  .get(getShoeById)
  .put(upload.array("images", 5), updateShoe)
  .delete(deleteShoe);

// Stock management
router.route("/shoes/:id/stock").patch(updateShoeStock);

// Archive (soft delete)
router.route("/shoes/:id/archive").patch(archiveShoe);

// Admin might need these filtering routes for management
router.route("/shoes/category/:category").get(getShoesByCategory);
router.route("/shoes/brand/:brand").get(getShoesByBrand);
router.route("/shoes/search").get(searchShoes);
router.route("/shoes/filter").get(getShoesByFilters);

export default router;
