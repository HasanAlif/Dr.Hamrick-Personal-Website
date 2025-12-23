import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { authService } from "./auth.service";

const loginUser = catchAsync(async (req, res) => {
  const result = await authService.loginUser(req.body);

  // Set token in HTTP-only cookie for automatic authentication
  res.cookie("token", result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User logged in successfully",
    data: result,
  });
});

const logoutUser = catchAsync(async (req: Request, res: Response) => {
  // Clear the token cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User Successfully logged out",
    data: null,
  });
});

// get user profile
const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.getMyProfile(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User profile retrieved successfully",
    data: result,
  });
});

// update admin profile
const updateAdminProfile = catchAsync(async (req: Request, res: Response) => {
  let profilePictureUrl: string | undefined;

  // Handle profile picture upload if provided
  if (req.file) {
    try {
      const { fileUploader } = await import("../../../helpers/fileUploader");
      const uploadResult = await fileUploader.uploadProfileImage(req.file);
      profilePictureUrl = uploadResult.Location;
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to upload profile picture to Cloudinary"
      );
    }
  }

  // Merge body data with uploaded file URL
  const updateData = {
    ...req.body,
    ...(profilePictureUrl && { profilePicture: profilePictureUrl }),
  };

  const result = await authService.updateAdminProfile(req.user.id, updateData);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Admin profile updated successfully",
    data: result,
  });
});

// change password
const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;

  const result = await authService.changePassword(
    req.user.id,
    newPassword,
    oldPassword
  );
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Password changed successfully",
    data: result,
  });
});

// forgot password
const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Check your email!",
    data: result,
  });
});
const resendOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.resendOtp(req.body.email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Check your email!",
    data: result,
  });
});
const verifyForgotPasswordOtp = catchAsync(
  async (req: Request, res: Response) => {
    const result = await authService.verifyForgotPasswordOtp(req.body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Now Redirect to Reset Password API!",
      data: result,
    });
  }
);

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, newPassword, confirmPassword, otp } = req.body;

  await authService.resetPassword(email, newPassword, confirmPassword, otp);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password Reset!",
    data: null,
  });
});

// get admin info for public display
const getAdminInfo = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.getAdminInfo();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Admin information retrieved successfully",
    data: result,
  });
});

export const AuthController = {
  loginUser,
  logoutUser,
  getMyProfile,
  updateAdminProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  resendOtp,
  verifyForgotPasswordOtp,
  getAdminInfo,
};
