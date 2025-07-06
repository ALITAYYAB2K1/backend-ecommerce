import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Cart } from "../models/Cart.models.js";
import { Shoe } from "../models/Shoe.models.js";

/**
 * Get user's cart
 */
const getCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let cart = await Cart.findOne({ userId }).populate({
    path: "items.productId",
    select: "name description price brand images sizes stock discount",
  });

  // Create empty cart if doesn't exist
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Cart retrieved successfully"));
});

/**
 * Add item to cart
 */
const addToCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId, shoeId, quantity = 1, size } = req.body;

  // Accept either productId or shoeId for flexibility
  const itemId = productId || shoeId;

  // Validate required fields
  if (!itemId || !size) {
    throw new ApiError(400, "Product ID (or shoeId) and size are required");
  }

  // Check if product exists
  const shoe = await Shoe.findById(itemId);
  if (!shoe) {
    throw new ApiError(404, "Shoe not found");
  }

  // Check if requested size is available
  if (!shoe.sizes.includes(size)) {
    throw new ApiError(400, "Requested size is not available");
  }

  // Check stock availability
  if (shoe.stock < quantity) {
    throw new ApiError(400, `Only ${shoe.stock} items available in stock`);
  }

  // Find or create cart
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }

  // Check if item already exists in cart (same product and size)
  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === itemId && item.size === size
  );

  if (existingItemIndex >= 0) {
    // Update quantity of existing item
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;

    // Check if new quantity exceeds stock
    if (newQuantity > shoe.stock) {
      throw new ApiError(
        400,
        `Cannot add more items. Only ${shoe.stock} available in stock`
      );
    }

    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Add new item to cart
    cart.items.push({
      productId: itemId,
      quantity,
      size,
      addedAt: new Date(),
    });
  }

  await cart.save();

  // Populate the cart before sending response
  await cart.populate({
    path: "items.productId",
    select: "name description price brand images sizes stock discount",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Item added to cart successfully"));
});

/**
 * Update item quantity in cart
 */
const updateCartItem = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId, shoeId, size, quantity } = req.body;

  // Accept either productId or shoeId for flexibility
  const itemId = productId || shoeId;

  if (!itemId || !size || !quantity) {
    throw new ApiError(
      400,
      "Product ID (or shoeId), size, and quantity are required"
    );
  }

  if (quantity < 1) {
    throw new ApiError(400, "Quantity must be at least 1");
  }

  // Check if product exists and get stock info
  const shoe = await Shoe.findById(itemId);
  if (!shoe) {
    throw new ApiError(404, "Shoe not found");
  }

  // Check stock availability
  if (shoe.stock < quantity) {
    throw new ApiError(400, `Only ${shoe.stock} items available in stock`);
  }

  const cart = await Cart.findOne({ userId });
  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  // Find the item in cart
  const itemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === itemId && item.size === size
  );

  if (itemIndex === -1) {
    throw new ApiError(404, "Item not found in cart");
  }

  // Update quantity
  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  // Populate the cart before sending response
  await cart.populate({
    path: "items.productId",
    select: "name description price brand images sizes stock discount",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Cart item updated successfully"));
});

/**
 * Remove item from cart
 */
const removeFromCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId, shoeId, size } = req.body;

  // Accept either productId or shoeId for flexibility
  const itemId = productId || shoeId;

  if (!itemId || !size) {
    throw new ApiError(400, "Product ID (or shoeId) and size are required");
  }

  const cart = await Cart.findOne({ userId });
  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  // Find and remove the item
  const itemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === itemId && item.size === size
  );

  if (itemIndex === -1) {
    throw new ApiError(404, "Item not found in cart");
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();

  // Populate the cart before sending response
  await cart.populate({
    path: "items.productId",
    select: "name description price brand images sizes stock discount",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Item removed from cart successfully"));
});

/**
 * Clear entire cart
 */
const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const cart = await Cart.findOne({ userId });
  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  cart.items = [];
  await cart.save();

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Cart cleared successfully"));
});

/**
 * Get cart summary (total items, total price)
 */
const getCartSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const cart = await Cart.findOne({ userId }).populate({
    path: "items.productId",
    select: "name price discount",
  });

  if (!cart) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { totalItems: 0, totalPrice: 0, items: [] },
          "Cart summary"
        )
      );
  }

  let totalPrice = 0;
  let totalItems = 0;

  cart.items.forEach((item) => {
    if (item.productId) {
      const price = item.productId.price;
      const discount = item.productId.discount || 0;
      const discountedPrice = price - (price * discount) / 100;
      totalPrice += discountedPrice * item.quantity;
      totalItems += item.quantity;
    }
  });

  const summary = {
    totalItems,
    totalPrice: Math.round(totalPrice * 100) / 100, // Round to 2 decimal places
    itemCount: cart.items.length,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, summary, "Cart summary retrieved successfully"));
});

export {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
};
