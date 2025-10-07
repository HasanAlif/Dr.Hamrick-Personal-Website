import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { blogService } from "./blog.service";
import { Request, Response } from "express";
import { fileUploader } from "../../../helpers/fileUploader";

const createBlog = catchAsync(async (req: Request, res: Response) => {
  const blogData = req.body;
  if (req.file) {
    try {
      const uploadResult = await fileUploader.uploadToCloudinary(
        req.file,
        "blogs"
      );
      blogData.coverImage = uploadResult.Location;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error("Error uploading file. Please try again.");
    }
  }
  const result = await blogService.createIntoDb(blogData);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Blog created successfully",
    data: result,
  });
});

const getBlogList = catchAsync(async (req: Request, res: Response) => {
  const { searchTerm, status, page, limit, sortBy, sortOrder } = req.query;

  const filters = {
    searchTerm: searchTerm as string,
    status: status !== undefined ? status === "true" : undefined,
  };

  const paginationOptions = {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string,
    sortOrder: sortOrder as string,
  };

  const result = await blogService.getListFromDb(filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blog list retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getWebsiteBlogList = catchAsync(async (req: Request, res: Response) => {
  const { searchTerm, status, page, limit, sortBy, sortOrder } = req.query;

  const filters = {
    searchTerm: searchTerm as string,
    status: status !== undefined ? status === "true" : undefined,
  };

  const paginationOptions = {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string,
    sortOrder: sortOrder as string,
  };

  const result = await blogService.getWebsiteBlogList(
    filters,
    paginationOptions
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blog list retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getBlogById = catchAsync(async (req, res) => {
  const result = await blogService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blog details retrieved successfully",
    data: result,
  });
});

const updateBlog = catchAsync(
  async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    const updateData = req.body;

    if (req.file) {
      try {
        if (req.file.mimetype.startsWith("image/")) {
          const uploadResult = await fileUploader.uploadToCloudinary(
            req.file,
            "blogs"
          );
          updateData.coverImage = uploadResult.Location;
        } else {
          updateData.coverImage = req.file.path || req.file.filename;
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        throw new Error("Error uploading file. Please try again.");
      }
    }

    const result = await blogService.updateIntoDb(req.params.id, updateData);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Blog updated successfully",
      data: result,
    });
  }
);

const deleteBlog = catchAsync(async (req, res) => {
  const result = await blogService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blog and associated images deleted successfully",
    data: result,
  });
});

export const blogController = {
  createBlog,
  getBlogList,
  getWebsiteBlogList,
  getBlogById,
  updateBlog,
  deleteBlog,
};
