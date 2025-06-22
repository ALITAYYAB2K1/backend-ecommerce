const mongoose = require("mongoose");
const cartSchema = new mongoose.Schema({
  userId: mongoose.Types.ObjectId,
  items: [
    {
      productId: mongoose.Types.ObjectId,
      quantity: Number,
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

export const Cart = mongoose.model("Cart", cartSchema);
