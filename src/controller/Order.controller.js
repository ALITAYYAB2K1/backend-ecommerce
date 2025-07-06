import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Order } from "../models/Order.models.js";
import { Cart } from "../models/Cart.models.js";
import { User } from "../models/User.models.js";
import { Shoe } from "../models/Shoe.models.js";

/**
 * Create order from cart (Checkout)
 */
const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    shippingAddress,
    paymentMethod = "cash_on_delivery",
    notes,
    phone,
  } = req.body;

  // Get user details to check if address and phone exist
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if user has phone number
  if (!user.phone && !phone) {
    throw new ApiError(
      400,
      "Phone number is required. Please update your profile or provide phone number in the request."
    );
  }

  // Check if shipping address is provided or exists in user profile
  let finalShippingAddress = shippingAddress;

  if (!shippingAddress) {
    if (
      !user.address?.street ||
      !user.address?.city ||
      !user.address?.province
    ) {
      throw new ApiError(
        400,
        "Shipping address is required. Please update your profile or provide shipping address in the request."
      );
    }
    finalShippingAddress = user.address;
  }

  // Validate shipping address fields
  const requiredAddressFields = ["street", "city", "province", "postalCode"];
  for (const field of requiredAddressFields) {
    if (!finalShippingAddress[field]) {
      throw new ApiError(400, `${field} is required in shipping address`);
    }
  }

  // Get user's cart
  const cart = await Cart.findOne({ userId }).populate("items.productId");
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Cart is empty. Add items before creating order.");
  }

  // Validate stock availability and calculate totals
  let totalAmount = 0;
  const orderItems = [];

  for (const cartItem of cart.items) {
    const shoe = cartItem.productId;

    // Check if shoe exists
    if (!shoe) {
      throw new ApiError(400, `Product not found for one of the cart items`);
    }

    // Check stock availability
    if (shoe.stock < cartItem.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for ${shoe.name}. Available: ${shoe.stock}, Requested: ${cartItem.quantity}`
      );
    }

    // Check if size is available
    if (!shoe.sizes.includes(cartItem.size)) {
      throw new ApiError(
        400,
        `Size ${cartItem.size} not available for ${shoe.name}`
      );
    }

    // Calculate price with discount
    const priceAtPurchase = shoe.price;
    const discountAtPurchase = shoe.discount || 0;
    const finalPrice = priceAtPurchase * (1 - discountAtPurchase / 100);

    totalAmount += finalPrice * cartItem.quantity;

    orderItems.push({
      productId: shoe._id,
      quantity: cartItem.quantity,
      size: cartItem.size,
      priceAtPurchase,
      discountAtPurchase,
    });
  }

  // Calculate shipping cost (example logic)
  const shippingCost = totalAmount > 5000 ? 0 : 200; // Free shipping over 5000
  const finalAmount = totalAmount + shippingCost;

  // Create order
  const order = await Order.create({
    userId,
    items: orderItems,
    shippingAddress: finalShippingAddress,
    contactInfo: {
      phone: phone || user.phone,
      email: user.email,
    },
    totalAmount,
    shippingCost,
    finalAmount,
    paymentMethod,
    notes,
    estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  });

  // Update stock for ordered items
  for (const item of orderItems) {
    await Shoe.findByIdAndUpdate(item.productId, {
      $inc: { stock: -item.quantity },
    });
  }

  // Clear user's cart
  await Cart.findOneAndUpdate(
    { userId },
    {
      items: [],
      totalItems: 0,
      totalPrice: 0,
    }
  );

  // Populate order for response
  await order.populate("items.productId", "name price images brand");

  return res
    .status(201)
    .json(new ApiResponse(201, order, "Order created successfully"));
});

/**
 * Get user's orders
 */
const getUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10, status } = req.query;

  // Build filter
  const filter = { userId };
  if (status) {
    filter.status = status;
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: {
      path: "items.productId",
      select: "name price images brand",
    },
  };

  const orders = await Order.paginate(filter, options);

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "Orders retrieved successfully"));
});

/**
 * Get single order details
 */
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const order = await Order.findOne({ _id: id, userId })
    .populate("items.productId", "name price images brand")
    .populate("userId", "name email");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order retrieved successfully"));
});

/**
 * Cancel order (only if status is pending or confirmed)
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const order = await Order.findOne({ _id: id, userId });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Check if order can be cancelled
  if (!["pending", "confirmed"].includes(order.status)) {
    throw new ApiError(400, "Order cannot be cancelled at this stage");
  }

  // Update order status
  order.status = "cancelled";
  await order.save();

  // Restore stock
  for (const item of order.items) {
    await Shoe.findByIdAndUpdate(item.productId, {
      $inc: { stock: item.quantity },
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order cancelled successfully"));
});

/**
 * Update user profile for checkout
 */
const updateProfileForCheckout = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { phone, address } = req.body;

  const updateData = {};
  if (phone) updateData.phone = phone;
  if (address) updateData.address = address;

  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  }).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile updated successfully"));
});

export {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  updateProfileForCheckout,
};
