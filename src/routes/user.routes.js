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
} from "../controller/User.controller.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/register/admin").post(registerAdmin);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/reset-password").post(resetPassword);
router.route("/update-info").put(verifyJWT, updateUserInfo);

export default router;
