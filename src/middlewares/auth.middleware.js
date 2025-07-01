import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/User.models.js";

// Authentication middleware - Checks if user is logged in
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith("Bearer")
        ? req.headers.authorization.replace("Bearer ", "")
        : null);

    if (!token) {
      throw new ApiError(401, "Unauthorized - No token provided");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Unauthorized");
  }
});

// Authorization middleware - Checks if user is an admin
export const authorizeAdmin = asyncHandler(async (req, _, next) => {
  // verifyJWT must be called before this middleware
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  // Check if user is admin using either isAdmin boolean or role field
  if (!req.user.isAdmin && req.user.role !== "admin") {
    throw new ApiError(403, "Forbidden - Admin access required");
  }

  next();
});
