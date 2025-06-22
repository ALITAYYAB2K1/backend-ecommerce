const mongoose = require("mongoose");
const shoeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  brand: String,
  images: [String],
  sizes: [Number], // example: [6, 7, 8, 9]
  stock: { type: Number, default: 0 },
  gender: { type: String, enum: ["male", "female", "unisex"], required: true },
  category: {
    type: String,
    enum: ["casual", "sport", "fashion", "normal"],
    required: true,
  },
  season: { type: String, enum: ["summer", "winter", "all"], default: "all" },
  createdAt: { type: Date, default: Date.now },
});

export const Shoe = mongoose.model("Shoe", shoeSchema);
