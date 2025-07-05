import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Shoe } from "../models/Shoe.models.js";
import { User } from "../models/User.models.js";
import { Review } from "../models/Review.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

// Helper function to delete an image from Cloudinary
/**
 * Helper function to delete an image from Cloudinary
 * Improved for more reliable deletion
 */
const deleteImageFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl) return { success: false, message: "No image URL provided" };

    console.log("Attempting to delete Cloudinary image:", imageUrl);

    // Extract the public ID from the Cloudinary URL
    // Format: http://res.cloudinary.com/dutan9dsu/image/upload/v1751648589/shoes/enuisc6p8urm97obhua8.png

    // First, find where the version number starts (after /upload/)
    const uploadIndex = imageUrl.indexOf("/upload/");
    if (uploadIndex === -1) {
      return { success: false, message: "Invalid Cloudinary URL format" };
    }

    // Extract everything after the version number
    const afterVersion = imageUrl.substring(uploadIndex + 8); // +8 for '/upload/'

    // Find the version number section (starts with 'v' followed by numbers)
    const versionMatch = afterVersion.match(/^v\d+\//);
    if (!versionMatch) {
      return { success: false, message: "Cannot find version number in URL" };
    }

    // Get everything after the version section until the file extension
    const afterVersionPath = afterVersion.substring(versionMatch[0].length);
    const publicIdWithExt = afterVersionPath.split(".");
    const publicId = publicIdWithExt[0]; // This is the full path without extension

    console.log("Extracted public ID:", publicId);

    // Use the direct method instead of wrapping in Promise
    const result = await cloudinary.uploader.destroy(publicId);

    console.log(`Cloudinary deletion result for ${publicId}:`, result);

    if (result && result.result === "ok") {
      return { success: true, result };
    } else {
      return {
        success: false,
        message: `Cloudinary API returned: ${
          result ? result.result : "unknown result"
        }`,
      };
    }
  } catch (error) {
    console.error(`Error processing image deletion:`, error);
    return { success: false, error: error.message };
  }
};
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
 * Update a shoe (Admin only) - Fixed for reliable image deletion
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
    keepImages, // Array of indices of images to keep
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

  // Handle image deletions if keepImages is provided
  if (keepImages !== undefined && shoe.images && shoe.images.length > 0) {
    console.log("Managing images with keepImages:", keepImages);

    // Convert keepImages to array of integers
    let keepIndices = [];
    if (typeof keepImages === "string") {
      // Handle comma-separated string of indices
      keepIndices = keepImages
        .split(",")
        .map((idx) => parseInt(idx.trim()))
        .filter((idx) => !isNaN(idx));
    } else if (Array.isArray(keepImages)) {
      // Handle array of indices (possibly as strings)
      keepIndices = keepImages
        .map((idx) => parseInt(idx))
        .filter((idx) => !isNaN(idx));
    }

    console.log("Keeping images at indices:", keepIndices);

    // Create a new array for kept images and a list of images to delete
    const newImages = [];
    const imagesToDelete = [];

    // Sort images into keep or delete
    shoe.images.forEach((imageUrl, index) => {
      if (keepIndices.includes(index)) {
        // Keep this image
        newImages.push(imageUrl);
      } else {
        // Mark for deletion
        imagesToDelete.push({ index, url: imageUrl });
      }
    });

    // Process deletions sequentially instead of in parallel
    for (const image of imagesToDelete) {
      console.log(`Deleting image at index ${image.index}:`, image.url);

      try {
        // Wait for each deletion to complete before moving to the next
        const deleteResult = await deleteImageFromCloudinary(image.url);

        if (!deleteResult.success) {
          console.error(
            `Failed to delete image at index ${image.index} from Cloudinary:`,
            deleteResult.message || "Unknown error"
          );
        } else {
          console.log(
            `Successfully deleted image at index ${image.index} from Cloudinary`
          );
        }
      } catch (error) {
        console.error(
          `Exception while deleting image at index ${image.index}:`,
          error
        );
        // Continue with other deletions even if one fails
      }
    }

    // Update the shoe's images array regardless of Cloudinary success
    // This ensures MongoDB is updated even if some Cloudinary operations fail
    shoe.images = newImages;
  }

  // Handle new image uploads
  if (req.files && req.files.length > 0) {
    console.log("Processing new uploaded files:", req.files.length);

    for (const file of req.files) {
      console.log(
        "Processing new file:",
        file.originalname,
        "at path:",
        file.path
      );

      // Upload each file to cloudinary
      const result = await uploadOnCloudinary(file.path, "shoes");

      // Check if upload was successful
      if (!result) {
        throw new ApiError(500, "Error uploading images to cloudinary");
      }

      // Add new image URL to shoe's images array
      if (result?.url) {
        console.log("Successfully uploaded new image:", result.url);
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
 * Delete a single image from a shoe (Admin only)
 */
const deleteShoeImage = asyncHandler(async (req, res) => {
  const { id, imageIndex } = req.params;
  const index = parseInt(imageIndex);

  // Validate the index
  if (isNaN(index) || index < 0) {
    throw new ApiError(400, "Invalid image index");
  }

  // Find the shoe
  const shoe = await Shoe.findById(id);
  if (!shoe) {
    throw new ApiError(404, "Shoe not found");
  }

  // Validate the image index is within range
  if (!shoe.images || index >= shoe.images.length) {
    throw new ApiError(404, "Image not found at specified index");
  }

  // Get the image URL to delete
  const imageToDelete = shoe.images[index];
  console.log(`Deleting image at index ${index}:`, imageToDelete);

  // Delete from Cloudinary
  const deleteResult = await deleteImageFromCloudinary(imageToDelete);

  if (!deleteResult.success) {
    console.error(
      "Failed to delete image from Cloudinary:",
      deleteResult.message
    );
    // Continue anyway to remove from MongoDB
  } else {
    console.log("Successfully deleted image from Cloudinary");
  }

  // Remove the image from the shoe's images array
  shoe.images.splice(index, 1);
  await shoe.save();

  return res
    .status(200)
    .json(new ApiResponse(200, shoe, "Image deleted successfully"));
});

/**
 * Delete a shoe (Admin only)
 */
const deleteShoe = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find the shoe to get the image URLs
  const shoe = await Shoe.findById(id);
  if (!shoe) {
    throw new ApiError(404, "Shoe not found");
  }

  // Delete images from Cloudinary if they exist
  if (shoe.images && shoe.images.length > 0) {
    console.log("Deleting associated images from Cloudinary");

    // Process deletions sequentially for reliability
    for (const imageUrl of shoe.images) {
      try {
        console.log("Deleting image:", imageUrl);
        const deleteResult = await deleteImageFromCloudinary(imageUrl);

        if (!deleteResult.success) {
          console.error(
            `Failed to delete image from Cloudinary:`,
            deleteResult.message || "Unknown error"
          );
        } else {
          console.log(`Successfully deleted image from Cloudinary`);
        }
      } catch (error) {
        console.error(`Exception while deleting image:`, error);
        // Continue with other deletions even if one fails
      }
    }
  }

  // Delete the shoe document from MongoDB
  await Shoe.findByIdAndDelete(id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Shoe and associated images deleted successfully"
      )
    );
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

/**
 * Get reviews for a specific shoe
 */
const getShoeReviews = asyncHandler(async (req, res) => {
  const { id } = req.params; // Shoe ID
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  const reviews = await Review.find({ shoeId: id })
    .populate({
      path: "userId",
      select: "name",
    })
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);

  const totalReviews = await Review.countDocuments({ shoeId: id });
  const totalPages = Math.ceil(totalReviews / limitNumber);

  // Calculate average rating
  const avgRating = await Review.aggregate([
    { $match: { shoeId: new mongoose.Types.ObjectId(id) } },
    { $group: { _id: null, averageRating: { $avg: "$rating" } } },
  ]);

  const averageRating = avgRating.length > 0 ? avgRating[0].averageRating : 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        reviews,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews,
        pagination: {
          total: totalReviews,
          page: pageNumber,
          limit: limitNumber,
          totalPages,
        },
      },
      "Shoe reviews retrieved successfully"
    )
  );
});

/**
 * Delete user's review for a shoe
 */
const deleteShoeReview = asyncHandler(async (req, res) => {
  const { id } = req.params; // Shoe ID
  const userId = req.user._id; // From auth middleware

  // Find the review by shoeId and userId
  const review = await Review.findOne({ shoeId: id, userId });

  if (!review) {
    throw new ApiError(
      404,
      "Review not found or you haven't reviewed this shoe"
    );
  }

  // Delete the review
  await Review.findByIdAndDelete(review._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Review deleted successfully"));
});

export {
  // Core CRUD
  createShoe,
  getAllShoes,
  getShoeById,
  updateShoe,
  deleteShoe,
  deleteShoeImage, // New export

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
  getShoeReviews,
  deleteShoeReview,
};
