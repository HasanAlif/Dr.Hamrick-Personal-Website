import { WebsiteContent, ContentType } from "./websiteContent.model";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

// Helper function to get human-readable content type name
const getContentTypeName = (type: ContentType): string => {
  const typeNames: Record<ContentType, string> = {
    [ContentType.ABOUT_US]: "About Us",
    [ContentType.PRIVACY_POLICY]: "Privacy Policy",
    [ContentType.MOTIVATION]: "Motivation",
    [ContentType.BLOG_MOTIVATION]: "Blog Motivation",
    [ContentType.PUBLICATION_MOTIVATION]: "Publication Motivation",
    [ContentType.VIDEO_MOTIVATION]: "Video Motivation",
    [ContentType.PODCAST_MOTIVATION]: "Podcast Motivation",
    [ContentType.DISCLAIMER]: "Disclaimer",
    [ContentType.FOOTTER_TEXT_1]: "Footer Text 1",
    [ContentType.FOOTTER_TEXT_2]: "Footer Text 2",
    [ContentType.CONTACT_TEXT]: "Contact Text",
  };
  return typeNames[type] || type;
};

// Create or update content by type (upsert)
const createOrUpdateContent = async (type: ContentType, content: string) => {
  const result = await WebsiteContent.findOneAndUpdate(
    { type },
    { content },
    { new: true, upsert: true, runValidators: true }
  );
  return result;
};

// Get content by type (public endpoint) - returns default if not found
const getContentByType = async (type: ContentType) => {
  const result = await WebsiteContent.findOne({ type });
  if (!result) {
    // Return default structure for missing content
    return {
      _id: null,
      type,
      content: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  return result;
};

// Get all content (public endpoint)
const getAllContent = async () => {
  const result = await WebsiteContent.find({}).sort({ type: 1 });
  return result;
};

// Delete content by type
const deleteContentByType = async (type: ContentType) => {
  const result = await WebsiteContent.findOneAndDelete({ type });
  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `${getContentTypeName(type)} not found`
    );
  }
  return result;
};

export const websiteContentService = {
  createOrUpdateContent,
  getContentByType,
  getAllContent,
  deleteContentByType,
};
