import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.models.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import { image_ID_Parser } from "../utils/imageParser.js";

import { sendEmail } from "../utils/sendEmail.js";
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    if (!user.generateRefreshToken || !user.generateAccessToken) {
      throw new ApiError(500, "Token generation methods are missing");
    }

    const refreshToken = user.generateRefreshToken();
    const accessToken = user.generateAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    throw new ApiError(400, "Name, Email, and Password are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "User already exists with this email");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const safeUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(201)
    .cookie("accessToken", accessToken, { httpOnly: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true })
    .json(
      new ApiResponse(
        201,
        {
          user: safeUser,
          accessToken,
          refreshToken,
        },
        "User registered successfully"
      )
    );
});

const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    throw new ApiError(400, "Name, Email, and Password are required");
  }

  // Check if already exists
  const existingAdmin = await User.findOne({ email });
  if (existingAdmin) {
    throw new ApiError(409, "Admin already exists with this email");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new admin
  const admin = await User.create({
    name,
    email,
    password: hashedPassword,
    role: "admin", // Fixed role
    isAdmin: true, // Optional, for quick checks
  });

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    admin._id
  );

  const safeAdmin = await User.findById(admin._id).select(
    "-password -refreshToken"
  );

  return res
    .status(201)
    .cookie("accessToken", accessToken, { httpOnly: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true })
    .json(
      new ApiResponse(
        201,
        {
          user: safeAdmin,
          accessToken,
          refreshToken,
        },
        "Admin registered successfully"
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const safeUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true })
    .json(
      new ApiResponse(
        200,
        {
          user: safeUser, // Includes role field (admin, manager, customer)
          accessToken,
          refreshToken,
        },
        `Login successful as ${safeUser.role}`
      )
    );
});
const logoutUser = asyncHandler(async (req, res) => {
  // Optional: clear refreshToken from DB
  if (req.user) {
    req.user.refreshToken = undefined;
    await req.user.save({ validateBeforeSave: false });
  }

  // Clear cookies
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully"));
});

const updateUserInfo = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const { name, phone, map, address = {} } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (map) user.map = map;

  if (address) {
    user.address = {
      ...user.address,
      ...address,
    };
  }

  await user.save();

  const updatedUser = await User.findById(userId).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User info updated successfully"));
});
// Add these functions to your User.controller.js file

// For logged-in users to update their password
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  // Validation
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  // Get user with password
  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if current password is correct
  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Current password is incorrect");
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

// Request password reset (sends email with reset link)
const forgotPassword = asyncHandler(async (req, res) => {
  console.log("Request body:", req.body); // Add this for debugging
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "No user found with this email");
  }

  // Generate reset token
  const resetToken = user.generateResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/password/reset/${resetToken}`;

  const message = `You requested a password reset. Please make a PUT request to: \n\n ${resetUrl} \n\n If you didn't request this, please ignore this email.`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Password Reset Token",
      message,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password reset email sent successfully"));
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    throw new ApiError(500, "Email could not be sent. Please try again later.");
  }
});

// Process reset password with token from URL
const resetPassword = asyncHandler(async (req, res) => {
  // Get token from params and hash it
  const resetToken = req.params.resetToken;
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Find user with valid token
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Password reset token is invalid or has expired");
  }

  // Validate password
  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword) {
    throw new ApiError(400, "Password and Confirm Password are required");
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  // Update password and clear reset fields
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  // Generate new tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "Password reset successful"
      )
    );
});

// Get user profile (implementation as requested)
const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  const user = await User.findById(userId).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { user }, "User profile retrieved successfully")
    );
});
export {
  registerUser,
  registerAdmin,
  loginUser,
  logoutUser,
  resetPassword,
  updateUserInfo,
  getUserProfile,
  updatePassword,
  forgotPassword,
};
