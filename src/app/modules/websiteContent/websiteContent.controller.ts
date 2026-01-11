import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { websiteContentService } from "./websiteContent.service";
import { ContentType } from "./websiteContent.model";

// Helper function to get human-readable content type name
const getContentTypeName = (type: string): string => {
  const typeNames: Record<string, string> = {
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

// Create or update content by type
const createOrUpdateContent = catchAsync(async (req, res) => {
  const { type } = req.params;
  const { content } = req.body;
  const result = await websiteContentService.createOrUpdateContent(
    type as ContentType,
    content
  );

  const contentTypeName = getContentTypeName(type);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${contentTypeName} updated successfully`,
    data: result,
  });
});

// Get content by type (public endpoint)
const getContentByType = catchAsync(async (req, res) => {
  const { type } = req.params;
  const result = await websiteContentService.getContentByType(
    type as ContentType
  );

  const contentTypeName = getContentTypeName(type);
  const message = result._id
    ? `${contentTypeName} retrieved successfully`
    : `${contentTypeName} not yet created`;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message,
    data: result,
  });
});

// Get all content (public endpoint)
const getAllContent = catchAsync(async (req, res) => {
  const result = await websiteContentService.getAllContent();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All website content retrieved successfully",
    data: result,
  });
});

// Delete content by type
const deleteContentByType = catchAsync(async (req, res) => {
  const { type } = req.params;
  const result = await websiteContentService.deleteContentByType(
    type as ContentType
  );

  const contentTypeName = getContentTypeName(type);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${contentTypeName} deleted successfully`,
    data: result,
  });
});

export const websiteContentController = {
  createOrUpdateContent,
  getContentByType,
  getAllContent,
  deleteContentByType,
};
