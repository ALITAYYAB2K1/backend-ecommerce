import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  registerUser,
  registerAdmin,
  loginUser,
  logoutUser,
  resetPassword,
  updateUserInfo,
  getUserProfile,
  updatePassword,
  forgotPassword,
} from "../controller/User.controller.js";

const router = Router();
router.route("/register").post(registerUser);
router.route("/register/admin").post(registerAdmin);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/password/forgot").post(forgotPassword);
router.route("/password/reset/:resetToken").put(resetPassword);
router.route("/update/password").patch(verifyJWT, updatePassword);
router.route("/update-info").put(verifyJWT, updateUserInfo);
router.route("/profile").get(verifyJWT, getUserProfile);

export default router;
