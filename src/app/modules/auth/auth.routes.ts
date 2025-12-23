import { UserRole } from "../../models";
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { authValidation } from "./auth.validation";
import { fileUploader } from "../../../helpers/fileUploader";

const router = express.Router();

// Public routes
// user login route
router.post("/login", AuthController.loginUser);

// user logout route
router.post("/logout", AuthController.logoutUser);

// Public admin info for website display
router.get("/admin-info", AuthController.getAdminInfo);

// Password recovery routes
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/resend-otp", AuthController.resendOtp);
router.post("/verify-otp", AuthController.verifyForgotPasswordOtp);

router.post(
  "/reset-password",
  validateRequest(authValidation.resetPasswordValidationSchema),
  AuthController.resetPassword
);

// Protected routes
router.get("/me", auth(), AuthController.getMyProfile);

// Admin only routes
router.patch(
  "/update-profile",
  auth(UserRole.ADMIN),
  fileUploader.uploadProfilePicture.single("profilePicture"),
  validateRequest(authValidation.updateAdminProfileValidationSchema),
  AuthController.updateAdminProfile
);

router.put(
  "/change-password",
  auth(),
  validateRequest(authValidation.changePasswordValidationSchema),
  AuthController.changePassword
);

router.post("/forgot-password", AuthController.forgotPassword);
router.post("/resend-otp", AuthController.resendOtp);
router.post("/verify-otp", AuthController.verifyForgotPasswordOtp);

router.post(
  "/reset-password",
  validateRequest(authValidation.resetPasswordValidationSchema),
  AuthController.resetPassword
);

export const authRoutes = router;
