import * as bcrypt from "bcrypt";
import crypto from "crypto";
import httpStatus from "http-status";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import emailSender from "../../../shared/emailSender";
import { User } from "../../models";
import { createExpiry, isExpired } from "../../../helpers/dateHelpers";

// user login
const loginUser = async (payload: {
  email: string;
  password: string;
  fcmToken?: string;
}) => {
  const userData = await User.findOne({
    email: payload.email,
  }).select({
    _id: 1,
    firstName: 1,
    lastName: 1,
    email: 1,
    role: 1,
    password: 1,
    createdAt: 1,
    updatedAt: 1,
    status: 1,
    profileImage: 1,
  });

  if (!userData?.email) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "User not found! with this email " + payload.email
    );
  }

  const isCorrectPassword: boolean = await bcrypt.compare(
    payload.password,
    userData.password
  );

  if (!isCorrectPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Password incorrect!");
  }

  // update fcm token
  if (payload.fcmToken) {
    await User.findOneAndUpdate(
      { email: payload.email },
      { fcmToken: payload.fcmToken }
    );
  }

  const accessToken = jwtHelpers.generateToken(
    {
      id: userData._id,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );

  const { password, ...withoutPassword } = userData.toObject();

  return { token: accessToken, userData: withoutPassword };
};

// get user profile
const getMyProfile = async (userId: string) => {
  const userProfile = await User.findById(userId).select({
    _id: 1,
    userName: 1,
    role: 1,
    phoneNumber: 1,
    email: 1,
    profilePicture: 1,
    location: 1,
    createdAt: 1,
    updatedAt: 1,
  });

  if (!userProfile) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found!");
  }

  return userProfile;
};

// update admin profile
const updateAdminProfile = async (
  userId: string,
  payload: {
    userName?: string;
    email?: string;
    phoneNumber?: string;
    location?: string;
    profilePicture?: string;
  }
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found!");
  }

  // Check if email is being changed and if it already exists
  if (payload.email && payload.email !== user.email) {
    const existingUser = await User.findOne({ email: payload.email });
    if (existingUser) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "Email already exists! Please use a different email."
      );
    }
  }

  // Delete old profile picture from Cloudinary if new one is being uploaded
  if (payload.profilePicture && user.profilePicture) {
    try {
      const { fileUploader } = await import("../../../helpers/fileUploader");
      await fileUploader.deleteFromCloudinary(user.profilePicture);
    } catch (error) {
      console.error("Error deleting old profile picture:", error);
      // Continue with update even if deletion fails
    }
  }

  // Update only provided fields
  const updateData: any = {};
  if (payload.userName !== undefined) updateData.userName = payload.userName;
  if (payload.email !== undefined) updateData.email = payload.email;
  if (payload.phoneNumber !== undefined)
    updateData.phoneNumber = payload.phoneNumber;
  if (payload.location !== undefined) updateData.location = payload.location;
  if (payload.profilePicture !== undefined)
    updateData.profilePicture = payload.profilePicture;

  const updatedProfile = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  }).select({
    _id: 1,
    userName: 1,
    role: 1,
    phoneNumber: 1,
    email: 1,
    profilePicture: 1,
    location: 1,
    createdAt: 1,
    updatedAt: 1,
  });

  return updatedProfile;
};

// change password
const changePassword = async (
  userId: string,
  newPassword: string,
  oldPassword: string
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found!");
  }

  const isCorrectPassword: boolean = await bcrypt.compare(
    oldPassword,
    user.password
  );

  if (!isCorrectPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Old password is incorrect!");
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  const result = await User.findByIdAndUpdate(
    userId,
    { password: hashedPassword },
    { new: true }
  );

  return result;
};

// forgot password
const forgotPassword = async (payload: { email: string }) => {
  const userData = await User.findOne({ email: payload.email });

  if (!userData) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User does not exist!");
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpiry = createExpiry(15); // 15 minutes from now (UTC)

  await User.findByIdAndUpdate(userData._id, {
    resetPasswordOtp: otp,
    resetPasswordOtpExpiry: otpExpiry,
  });

  // Send OTP via email
  await emailSender(
    payload.email,
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Password Reset Verification</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello,</p>
    <p>We received a request to reset your password. If you didn't make this request, please ignore this email.</p>
    <p>Your password reset verification code is:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50; background-color: #f0f0f0; padding: 15px 20px; border-radius: 8px; display: inline-block;"><strong>${otp}</strong></span>
    </div>
    <p>Enter this code on the password reset page to proceed with resetting your password.</p>
    <p>This code will expire in 15 minutes for security reasons.</p>
    <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
    <p>Best regards,<br>Dr.Irene Hamrick</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>`,
    "Password Reset OTP"
  );

  return { message: "OTP sent to your email", otp }; // Remove otp in production
};

// resend OTP
const resendOtp = async (email: string) => {
  const userData = await User.findOne({ email });

  if (!userData) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User does not exist!");
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpiry = createExpiry(15); // 15 minutes from now (UTC)

  await User.findByIdAndUpdate(userData._id, {
    resetPasswordOtp: otp,
    resetPasswordOtpExpiry: otpExpiry,
  });

  // Send OTP via email
  await emailSender(
    email,
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Password Reset Verification</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello,</p>
    <p>We received a request to reset your password. If you didn't make this request, please ignore this email.</p>
    <p>Your password reset verification code is:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50; background-color: #f0f0f0; padding: 15px 20px; border-radius: 8px; display: inline-block;"><strong>${otp}</strong></span>
    </div>
    <p>Enter this code on the password reset page to proceed with resetting your password.</p>
    <p>This code will expire in 15 minutes for security reasons.</p>
    <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
    <p>Best regards,<br>Dr.Irene Hamrick</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>`,
    "Password Reset OTP"
  );

  return { message: "OTP resent to your email", otp }; // Remove otp in production
};

// verify forgot password OTP
const verifyForgotPasswordOtp = async (payload: {
  email: string;
  otp: string;
}) => {
  const user = await User.findOne({ email: payload.email });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found!");
  }

  if (
    user.resetPasswordOtp !== payload.otp ||
    !user.resetPasswordOtpExpiry ||
    isExpired(user.resetPasswordOtpExpiry)
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired OTP!");
  }

  return { message: "OTP verified successfully", isValid: true };
};

// reset password
const resetPassword = async (
  email: string,
  newPassword: string,
  confirmPassword: string,
  otp: string
) => {
  // Check if passwords match
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "New password and confirm password do not match!"
    );
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found!");
  }

  if (
    user.resetPasswordOtp !== otp ||
    !user.resetPasswordOtpExpiry ||
    isExpired(user.resetPasswordOtpExpiry)
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired OTP!");
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  await User.findByIdAndUpdate(user._id, {
    password: hashedPassword,
    resetPasswordOtp: undefined,
    resetPasswordOtpExpiry: undefined,
  });

  return { message: "Password reset successfully" };
};

// get admin info for public display
const getAdminInfo = async () => {
  const admin = await User.findOne({
    role: "ADMIN",
    status: "ACTIVE",
  }).select({
    phoneNumber: 1,
    email: 1,
    location: 1,
    profilePicture: 1,
    userName: 1,
    _id: 0, // Exclude ID for privacy
  });

  if (!admin) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Admin information not available at this time"
    );
  }

  return admin;
};

export const authService = {
  loginUser,
  getMyProfile,
  updateAdminProfile,
  changePassword,
  forgotPassword,
  resendOtp,
  verifyForgotPasswordOtp,
  resetPassword,
  getAdminInfo,
};
