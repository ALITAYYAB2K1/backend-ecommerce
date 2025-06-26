import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import { image_ID_Parser } from "../utils/imageParser.js";
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
