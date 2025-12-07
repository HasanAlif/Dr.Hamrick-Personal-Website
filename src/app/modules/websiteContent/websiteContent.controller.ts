import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { websiteContentService } from "./websiteContent.service";
import { ContentType } from "./websiteContent.model";

const updateContentByType = catchAsync(async (req, res) => {
  const { type } = req.params;
  const { content } = req.body;
  const result = await websiteContentService.updateContentByType(
    type as ContentType,
    content
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Content updated successfully",
    data: result,
  });
});

const getContentByType = catchAsync(async (req, res) => {
  const { type } = req.params;
  const result = await websiteContentService.getContentByType(
    type as ContentType
  );

  const message =
    type === ContentType.ABOUT_US
      ? "About Us retrieved successfully"
      : "Privacy Policy retrieved successfully";

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message,
    data: result,
  });
});

export const websiteContentController = {
  updateContentByType,
  getContentByType,
};
