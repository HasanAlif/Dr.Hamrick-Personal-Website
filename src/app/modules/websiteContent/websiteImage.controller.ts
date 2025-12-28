import { Request, Response } from "express";
import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { websiteImageService } from "./websiteImage.service";
import { fileUploader } from "../../../helpers/fileUploader";
import ApiError from "../../../errors/ApiErrors";

const createWebsiteImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Image file is required");
  }

  // Upload to Cloudinary
  const uploadResult = await fileUploader.uploadToCloudinary(
    req.file,
    "website-images"
  );

  const imageData = {
    image: uploadResult.Location,
  };

  const result = await websiteImageService.createIntoDb(imageData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Website image created successfully",
    data: result,
  });
});

const updateWebsiteImage = catchAsync(async (req: Request, res: Response) => {
  const imageId = req.params.id;

  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Image file is required");
  }

  // Upload new image to Cloudinary
  const uploadResult = await fileUploader.uploadToCloudinary(
    req.file,
    "website-images"
  );

  const updateData = {
    image: uploadResult.Location,
  };

  const result = await websiteImageService.updateIntoDb(imageId, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Website image updated successfully",
    data: result,
  });
});

const deleteWebsiteImage = catchAsync(async (req: Request, res: Response) => {
  const imageId = req.params.id;
  const result = await websiteImageService.deleteItemFromDb(imageId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Website image deleted successfully",
    data: result,
  });
});

const getAllWebsiteImages = catchAsync(async (req: Request, res: Response) => {
  const result = await websiteImageService.getAllFromDb();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Website images retrieved successfully",
    data: result,
  });
});

export const websiteImageController = {
  createWebsiteImage,
  updateWebsiteImage,
  deleteWebsiteImage,
  getAllWebsiteImages,
};
