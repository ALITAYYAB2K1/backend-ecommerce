import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Shoe } from "../models/Shoe.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
// CORE CRUD OPERATIONS

/**
 * Create a new shoe (Admin only)
 */
const createShoe = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    brand,
    sizes,
    stock,
    gender,
    category,
    season,
  } = req.body;

  // Validate required fields
  if (!name || !price || !gender || !category) {
    throw new ApiError(400, "Name, price, gender, and category are required");
  }

  // Handle image uploads
  let imageUrls = [];
  if (req.files && req.files.length > 0) {
    console.log("Processing uploaded files:", req.files.length);

    // Process each uploaded file
    for (const file of req.files) {
      console.log("Processing file:", file.originalname, "at path:", file.path);

      const result = await uploadOnCloudinary(file.path, "shoes");

      // Check if upload was successful
      if (!result) {
        console.log("Upload failed for file:", file.originalname);
        throw new ApiError(
          500,
          `Error uploading image ${file.originalname} to cloudinary`
        );
      }

      // Add image URL to array
      if (result?.url) {
        console.log("Successfully uploaded:", result.url);
        imageUrls.push(result.url);
      }
    }
  }

  // Create the shoe record in database
  const shoe = await Shoe.create({
    name,
    description,
    price,
    brand,
    images: imageUrls,
    sizes: sizes || [],
    stock: stock || 0,
    gender,
    category,
    season: season || "all",
  });

  // Return success response
  return res
    .status(201)
    .json(new ApiResponse(201, shoe, "Shoe created successfully"));
});

/**
 * Update a shoe (Admin only)
 */
const updateShoe = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    brand,
    sizes,
    stock,
    gender,
    category,
    season,
  } = req.body;

  // Find the shoe by ID
  const shoe = await Shoe.findById(id);
  if (!shoe) {
    throw new ApiError(404, "Shoe not found");
  }

  // Update fields if provided
  if (name) shoe.name = name;
  if (description) shoe.description = description;
  if (price) shoe.price = price;
  if (brand) shoe.brand = brand;
  if (sizes) shoe.sizes = sizes;
  if (stock !== undefined) shoe.stock = stock;
  if (gender) shoe.gender = gender;
  if (category) shoe.category = category;
  if (season) shoe.season = season;

  // Handle image uploads
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      // Upload each file to cloudinary
      const result = await uploadOnCloudinary(file.path, "shoes");

      // Check if upload was successful
      if (!result) {
        throw new ApiError(500, "Error uploading images to cloudinary");
      }

      // Add new image URL to shoe's images array
      if (result?.url) {
        shoe.images.push(result.url);
      }
    }
  }

  // Save the updated shoe
  await shoe.save();

  // Return success response
  return res
    .status(200)
    .json(new ApiResponse(200, shoe, "Shoe updated successfully"));
});

/**
 * Get all shoes with pagination and basic filtering
 */
const getAllShoes = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  // Build sort object for mongoose
  const sortObject = {};
  sortObject[sort] = order === "desc" ? -1 : 1;

  const shoes = await Shoe.find()
    .sort(sortObject)
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);

  const totalShoes = await Shoe.countDocuments();
  const totalPages = Math.ceil(totalShoes / limitNumber);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        shoes,
        pagination: {
          total: totalShoes,
          page: pageNumber,
          limit: limitNumber,
          totalPages,
        },
      },
      "Shoes retrieved successfully"
    )
  );
});

/**
 * Get a specific shoe by ID
 */
const getShoeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const shoe = await Shoe.findById(id);
  if (!shoe) {
    throw new ApiError(404, "Shoe not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, shoe, "Shoe retrieved successfully"));
});

/**
 * Delete a shoe (Admin only)
 */
const deleteShoe = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const shoe = await Shoe.findById(id);
  if (!shoe) {
    throw new ApiError(404, "Shoe not found");
  }

  await Shoe.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Shoe deleted successfully"));
});

// FILTERING AND SEARCH OPERATIONS

/**
 * Get shoes by category
 */
const getShoesByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  const shoes = await Shoe.find({ category })
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);

  const totalShoes = await Shoe.countDocuments({ category });
  const totalPages = Math.ceil(totalShoes / limitNumber);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        shoes,
        pagination: {
          total: totalShoes,
          page: pageNumber,
          limit: limitNumber,
          totalPages,
        },
      },
      `${category} shoes retrieved successfully`
    )
  );
});

/**
 * Get shoes by brand
 */
const getShoesByBrand = asyncHandler(async (req, res) => {
  const { brand } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  const shoes = await Shoe.find({ brand })
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);

  const totalShoes = await Shoe.countDocuments({ brand });
  const totalPages = Math.ceil(totalShoes / limitNumber);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        shoes,
        pagination: {
          total: totalShoes,
          page: pageNumber,
          limit: limitNumber,
          totalPages,
        },
      },
      `${brand} shoes retrieved successfully`
    )
  );
});

/**
 * Search shoes by keyword
 */
const searchShoes = asyncHandler(async (req, res) => {
  const { keyword } = req.query;
  const { page = 1, limit = 10 } = req.query;

  if (!keyword) {
    throw new ApiError(400, "Search keyword is required");
  }

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  // Search in name, description, and brand fields
  const searchQuery = {
    $or: [
      { name: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
      { brand: { $regex: keyword, $options: "i" } },
    ],
  };

  const shoes = await Shoe.find(searchQuery)
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);

  const totalShoes = await Shoe.countDocuments(searchQuery);
  const totalPages = Math.ceil(totalShoes / limitNumber);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        shoes,
        pagination: {
          total: totalShoes,
          page: pageNumber,
          limit: limitNumber,
          totalPages,
        },
      },
      `Search results for "${keyword}"`
    )
  );
});

/**
 * Get featured shoes (can be based on criteria like newest, popular, etc.)
 */
const getFeaturedShoes = asyncHandler(async (req, res) => {
  // Here you can implement your logic for what makes a shoe "featured"
  // For example, newest arrivals or highest rated
  const featuredShoes = await Shoe.find()
    .sort({ createdAt: -1 }) // Newest first
    .limit(8); // Limit to 8 featured shoes

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        featuredShoes,
        "Featured shoes retrieved successfully"
      )
    );
});

/**
 * Get shoes on sale (you would need to add a discount field to your model)
 */
const getShoesOnSale = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  // This assumes you have a "discount" field in your model
  // If not, you would need to adjust your schema
  const shoes = await Shoe.find({ discount: { $gt: 0 } })
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);

  const totalShoes = await Shoe.countDocuments({ discount: { $gt: 0 } });
  const totalPages = Math.ceil(totalShoes / limitNumber);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        shoes,
        pagination: {
          total: totalShoes,
          page: pageNumber,
          limit: limitNumber,
          totalPages,
        },
      },
      "Shoes on sale retrieved successfully"
    )
  );
});

/**
 * Get shoes by advanced filtering
 */
const getShoesByFilters = asyncHandler(async (req, res) => {
  const {
    minPrice,
    maxPrice,
    sizes,
    brands,
    genders,
    categories,
    seasons,
    page = 1,
    limit = 10,
  } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  // Build filter object
  const filter = {};

  if (minPrice && maxPrice) {
    filter.price = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };
  } else if (minPrice) {
    filter.price = { $gte: parseFloat(minPrice) };
  } else if (maxPrice) {
    filter.price = { $lte: parseFloat(maxPrice) };
  }

  if (sizes) {
    const sizeArray = sizes.split(",").map((size) => parseFloat(size));
    filter.sizes = { $in: sizeArray };
  }

  if (brands) {
    const brandArray = brands.split(",");
    filter.brand = { $in: brandArray };
  }

  if (genders) {
    const genderArray = genders.split(",");
    filter.gender = { $in: genderArray };
  }

  if (categories) {
    const categoryArray = categories.split(",");
    filter.category = { $in: categoryArray };
  }

  if (seasons) {
    const seasonArray = seasons.split(",");
    filter.season = { $in: seasonArray };
  }

  const shoes = await Shoe.find(filter)
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);

  const totalShoes = await Shoe.countDocuments(filter);
  const totalPages = Math.ceil(totalShoes / limitNumber);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        shoes,
        pagination: {
          total: totalShoes,
          page: pageNumber,
          limit: limitNumber,
          totalPages,
        },
      },
      "Filtered shoes retrieved successfully"
    )
  );
});

// STOCK & INVENTORY MANAGEMENT (ADMIN)

/**
 * Update shoe stock (Admin only)
 */
const updateShoeStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  if (stock === undefined) {
    throw new ApiError(400, "Stock quantity is required");
  }

  const shoe = await Shoe.findById(id);
  if (!shoe) {
    throw new ApiError(404, "Shoe not found");
  }

  shoe.stock = stock;
  await shoe.save();

  return res
    .status(200)
    .json(new ApiResponse(200, shoe, "Stock updated successfully"));
});

/**
 * Bulk update shoes (Admin only)
 */
const bulkUpdateShoes = asyncHandler(async (req, res) => {
  const { updates } = req.body;

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    throw new ApiError(400, "Valid updates array is required");
  }

  const updatePromises = updates.map(async (update) => {
    const { id, ...updateData } = update;
    if (!id) return { success: false, message: "Shoe ID is required" };

    try {
      const updatedShoe = await Shoe.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      return { success: true, id, shoe: updatedShoe };
    } catch (error) {
      return { success: false, id, message: error.message };
    }
  });

  const results = await Promise.all(updatePromises);

  return res
    .status(200)
    .json(new ApiResponse(200, { results }, "Bulk update completed"));
});

/**
 * Archive shoe (soft delete) (Admin only)
 */
const archiveShoe = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const shoe = await Shoe.findById(id);
  if (!shoe) {
    throw new ApiError(404, "Shoe not found");
  }

  // This assumes you have an "isArchived" field
  // If not, you would need to adjust your schema
  shoe.isArchived = true;
  await shoe.save();

  return res
    .status(200)
    .json(new ApiResponse(200, shoe, "Shoe archived successfully"));
});

// CUSTOMER-SIDE LOGIC

/**
 * Add shoe to user's wishlist
 */
const addShoeToWishlist = asyncHandler(async (req, res) => {
  const { id } = req.params; // Shoe ID
  const userId = req.user._id; // From auth middleware

  // This assumes you have a User model with a wishlist field
  // You would need to adjust based on your actual schema
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const shoe = await Shoe.findById(id);
  if (!shoe) {
    throw new ApiError(404, "Shoe not found");
  }

  // Check if already in wishlist
  if (user.wishlist && user.wishlist.includes(id)) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, { inWishlist: true }, "Shoe already in wishlist")
      );
  }

  // Add to wishlist
  if (!user.wishlist) user.wishlist = [];
  user.wishlist.push(id);
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { inWishlist: true }, "Shoe added to wishlist"));
});

/**
 * Rate or review a shoe
 */
const rateOrReviewShoe = asyncHandler(async (req, res) => {
  const { id } = req.params; // Shoe ID
  const userId = req.user._id; // From auth middleware
  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  const shoe = await Shoe.findById(id);
  if (!shoe) {
    throw new ApiError(404, "Shoe not found");
  }

  // This assumes you have a separate Review model
  // Adjust based on your actual schema design
  const newReview = await Review.create({
    userId,
    shoeId: id,
    rating,
    review: review || "",
    createdAt: new Date(),
  });

  // Update average rating on shoe
  // This would require aggregation or additional logic

  return res
    .status(201)
    .json(new ApiResponse(201, newReview, "Review submitted successfully"));
});

/**
 * Get similar shoes based on current shoe
 */
const getSimilarShoes = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const shoe = await Shoe.findById(id);
  if (!shoe) {
    throw new ApiError(404, "Shoe not found");
  }

  // Find shoes with same brand or category, excluding the current shoe
  const similarShoes = await Shoe.find({
    _id: { $ne: id },
    $or: [{ brand: shoe.brand }, { category: shoe.category }],
  }).limit(6);

  return res
    .status(200)
    .json(
      new ApiResponse(200, similarShoes, "Similar shoes retrieved successfully")
    );
});

export {
  // Core CRUD
  createShoe,
  getAllShoes,
  getShoeById,
  updateShoe,
  deleteShoe,

  // Filtering and Search
  getShoesByCategory,
  getShoesByBrand,
  searchShoes,
  getFeaturedShoes,
  getShoesOnSale,
  getShoesByFilters,

  // Inventory Management
  updateShoeStock,
  bulkUpdateShoes,
  archiveShoe,

  // Customer Interactions
  addShoeToWishlist,
  rateOrReviewShoe,
  getSimilarShoes,
};
