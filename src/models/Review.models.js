import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shoeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shoe",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one review per user per shoe
reviewSchema.index({ userId: 1, shoeId: 1 }, { unique: true });

export const Review = mongoose.model("Review", reviewSchema);
