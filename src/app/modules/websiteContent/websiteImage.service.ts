import { WebsiteImage, IWebsiteImage } from "./websiteImage.model";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { fileUploader } from "../../../helpers/fileUploader";

const createIntoDb = async (imageData: Partial<IWebsiteImage>) => {
  const result = await WebsiteImage.create(imageData);
  return result;
};

const updateIntoDb = async (
  id: string,
  data: Partial<IWebsiteImage>
): Promise<IWebsiteImage> => {
  const existingImage = await WebsiteImage.findById(id);
  if (!existingImage) {
    throw new ApiError(httpStatus.NOT_FOUND, "Website image not found");
  }

  const isImageReplaced = !!data.image && data.image !== existingImage.image;

  const result = await WebsiteImage.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Website image not found");
  }

  // Delete old image from Cloudinary AFTER successful update
  if (isImageReplaced && existingImage.image) {
    fileUploader.deleteFromCloudinary(existingImage.image).catch((err: any) => {
      console.error("Failed to delete old image from Cloudinary:", err);
    });
  }

  return result;
};

const deleteItemFromDb = async (id: string) => {
  const image = await WebsiteImage.findById(id);
  if (!image) {
    throw new ApiError(httpStatus.NOT_FOUND, "Website image not found");
  }

  const result = await WebsiteImage.findByIdAndDelete(id);

  // Delete image from Cloudinary
  if (image.image) {
    fileUploader.deleteFromCloudinary(image.image).catch((err: any) => {
      console.error("Failed to delete image from Cloudinary:", err);
    });
  }

  return result;
};

const getAllFromDb = async () => {
  const result = await WebsiteImage.find().sort({ createdAt: -1 });
  return result;
};

export const websiteImageService = {
  createIntoDb,
  updateIntoDb,
  deleteItemFromDb,
  getAllFromDb,
};
