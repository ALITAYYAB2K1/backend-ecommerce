import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      default: function () {
        // Generate a unique order number directly instead of using async pre-save
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0");
        return `ORD${timestamp}${random}`;
      },
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Shoe",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        size: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        priceAtPurchase: {
          type: Number,
          required: true,
        },
        discountAtPurchase: {
          type: Number,
          default: 0,
        },
      },
    ],
    shippingAddress: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      province: {
        type: String,
        required: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        default: "Pakistan",
      },
    },
    contactInfo: {
      phone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "card", "bank_transfer"],
      default: "cash_on_delivery",
    },
    notes: {
      type: String,
    },
    trackingNumber: {
      type: String,
    },
    estimatedDelivery: {
      type: Date,
    },
    placedAt: {
      type: Date,
      default: Date.now,
    },
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
  },
  {
    timestamps: true,
  }
);

// Add pagination plugin
orderSchema.plugin(mongoosePaginate);

// Remove the async pre-save hook and use the default function instead
// This solves the validation issue with orderNumber

export const Order = mongoose.model("Order", orderSchema);
