const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema({
  userId: mongoose.Types.ObjectId,
  items: [
    {
      productId: mongoose.Types.ObjectId,
      quantity: Number,
      priceAtPurchase: Number,
    },
  ],
  shippingAddress: {
    street: String,
    city: String,
    province: String,
    postalCode: String,
    country: String,
  },
  totalAmount: Number,
  status: {
    type: String,
    enum: ["waiting", "dispatched", "delivered", "returned"],
    default: "waiting",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending",
  },
  placedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Order", orderSchema);
