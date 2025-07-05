import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    otp: {
      type: String,
    },

    otpExpiry: {
      type: Date,
    },
    phone: {
      type: String,
    },

    address: {
      street: String,
      city: String,
      province: String,
      postalCode: String,
      country: {
        type: String,
        default: "Pakistan",
      },
    },
    map: {
      type: String,
    },
    // Added missing refreshToken field
    refreshToken: {
      type: String,
    },
    // Fields for password reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // Role field
    role: {
      type: String,
      default: "user",
    },
    // Wishlist field for storing favorite shoes
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shoe",
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      name: this.name, // Changed from fullname to name
      role: this.role || "user",
      isAdmin: this.isAdmin,
    },
    process.env.ACCESS_TOKEN_SECRET || "your-access-token-secret",
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET || "your-refresh-token-secret",
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
  );
};

userSchema.methods.generateResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 30 * (60 * 1000);
  return resetToken;
};

export const User = mongoose.model("User", userSchema);
