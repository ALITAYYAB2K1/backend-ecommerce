import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Order } from "../models/Order.models.js";

/**
 * Get all orders (Admin)
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    paymentStatus,
    sortBy = "createdAt",
    sortOrder = "desc",
    search,
  } = req.query;

  // Build filter
  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  // Search by order number or user email
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { "contactInfo.email": { $regex: search, $options: "i" } },
    ];
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
    populate: [
      {
        path: "items.productId",
        select: "name price images brand",
      },
      {
        path: "userId",
        select: "name email",
      },
    ],
  };

  const orders = await Order.paginate(filter, options);

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "Orders retrieved successfully"));
});

/**
 * Get order statistics (Admin)
 */
const getOrderStats = asyncHandler(async (req, res) => {
  const stats = await Order.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$finalAmount" },
      },
    },
  ]);

  const paymentStats = await Order.aggregate([
    {
      $group: {
        _id: "$paymentStatus",
        count: { $sum: 1 },
        totalAmount: { $sum: "$finalAmount" },
      },
    },
  ]);

  // Total orders and revenue
  const totalStats = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: "$finalAmount" },
        averageOrderValue: { $avg: "$finalAmount" },
      },
    },
  ]);

  // Recent orders count (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentOrdersCount = await Order.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        statusStats: stats,
        paymentStats,
        totalStats: totalStats[0] || {},
        recentOrdersCount,
      },
      "Order statistics retrieved successfully"
    )
  );
});

/**
 * Update order status (Admin)
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, trackingNumber, notes } = req.body;

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  const validStatuses = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
  ];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Update status and related timestamps
  order.status = status;
  if (notes) order.notes = notes;
  if (trackingNumber) order.trackingNumber = trackingNumber;

  // Set timestamps based on status
  switch (status) {
    case "confirmed":
      order.confirmedAt = new Date();
      break;
    case "shipped":
      order.shippedAt = new Date();
      break;
    case "delivered":
      order.deliveredAt = new Date();
      break;
  }

  await order.save();

  // Populate for response
  await order.populate([
    { path: "items.productId", select: "name price images brand" },
    { path: "userId", select: "name email" },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order status updated successfully"));
});

/**
 * Update payment status (Admin)
 */
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!paymentStatus) {
    throw new ApiError(400, "Payment status is required");
  }

  const validPaymentStatuses = ["pending", "paid", "failed", "refunded"];
  if (!validPaymentStatuses.includes(paymentStatus)) {
    throw new ApiError(400, "Invalid payment status");
  }

  const order = await Order.findByIdAndUpdate(
    id,
    { paymentStatus },
    { new: true }
  ).populate([
    { path: "items.productId", select: "name price images brand" },
    { path: "userId", select: "name email" },
  ]);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Payment status updated successfully"));
});

/**
 * Delete order (Admin) - Only for cancelled orders
 */
const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.status !== "cancelled") {
    throw new ApiError(400, "Only cancelled orders can be deleted");
  }

  await Order.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Order deleted successfully"));
});

/**
 * Get order by ID (Admin)
 */
const getOrderByIdAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id)
    .populate("items.productId", "name price images brand stock")
    .populate("userId", "name email phone address");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order retrieved successfully"));
});

export {
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder,
  getOrderByIdAdmin,
};
