import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { blogService } from "./blog.service";
import { Request, Response } from "express";
import { fileUploader } from "../../../helpers/fileUploader";
import {
  uploadBlogAudio,
  deleteBlogAudio,
  refreshSignedUrl,
} from "../../../helpers/googleCloudStorage";
import { Blog } from "./blog.model";

const createBlog = catchAsync(async (req: Request, res: Response) => {
  const blogData = req.body;

  // Handle audio file upload to GCS
  if (req.file) {
    try {
      const uploadResult = await uploadBlogAudio(req.file);
      blogData.audioUrl = uploadResult.publicUrl;
      blogData.audioSignedUrl = uploadResult.signedUrl;
      blogData.audioFileName = uploadResult.fileName;
      blogData.audioSize = uploadResult.fileSize;
      blogData.audioFormat = uploadResult.contentType;
    } catch (error) {
      console.error("Error uploading audio file:", error);
      throw new Error("Error uploading audio file. Please try again.");
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
    status: status as string,
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
  const { searchTerm, page, limit, sortBy, sortOrder } = req.query;

  const filters = {
    searchTerm: searchTerm as string,
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

// Admin route - returns all blogs regardless of status
const getBlogById = catchAsync(async (req, res) => {
  const blog = await blogService.getByIdFromDb(req.params.id, false);

  // Refresh signed URL if blog has audio file
  if (blog && blog.audioFileName) {
    try {
      const freshSignedUrl = await refreshSignedUrl(blog.audioFileName);
      blog.audioSignedUrl = freshSignedUrl;
    } catch (error) {
      console.error("Error refreshing audio signed URL:", error);
    }
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blog details retrieved successfully",
    data: blog,
  });
});

// Public route - only returns published blogs
const getWebsiteBlogById = catchAsync(async (req, res) => {
  const blog = await blogService.getByIdFromDb(req.params.id, true);

  // Refresh signed URL if blog has audio file
  if (blog && blog.audioFileName) {
    try {
      const freshSignedUrl = await refreshSignedUrl(blog.audioFileName);
      blog.audioSignedUrl = freshSignedUrl;
    } catch (error) {
      console.error("Error refreshing audio signed URL:", error);
    }
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blog details retrieved successfully",
    data: blog,
  });
});

const updateBlog = catchAsync(
  async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    const updateData = req.body;
    const blogId = req.params.id;

    // Get existing blog to check for old audio file
    const existingBlog = await Blog.findById(blogId);
    if (!existingBlog) {
      sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "Blog not found",
        data: null,
      });
      return;
    }

    // Handle new audio file upload
    if (req.file) {
      try {
        // Upload new audio file to GCS
        const uploadResult = await uploadBlogAudio(req.file);
        updateData.audioUrl = uploadResult.publicUrl;
        updateData.audioSignedUrl = uploadResult.signedUrl;
        updateData.audioFileName = uploadResult.fileName;
        updateData.audioSize = uploadResult.fileSize;
        updateData.audioFormat = uploadResult.contentType;

        // Delete old audio file from GCS after successful upload
        if (existingBlog.audioFileName) {
          await deleteBlogAudio(existingBlog.audioFileName);
        }
      } catch (error) {
        console.error("Error uploading audio file:", error);
        throw new Error("Error uploading audio file. Please try again.");
      }
    }

    const result = await blogService.updateIntoDb(blogId, updateData);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Blog updated successfully",
      data: result,
    });
  }
);

const deleteBlog = catchAsync(async (req, res) => {
  const blogId = req.params.id;

  // Get blog to retrieve audio file info before deletion
  const blog = await Blog.findById(blogId);
  if (!blog) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: "Blog not found",
      data: null,
    });
    return;
  }

  // Delete audio file from GCS if exists
  if (blog.audioFileName) {
    try {
      await deleteBlogAudio(blog.audioFileName);
    } catch (error) {
      console.error("Error deleting audio from GCS:", error);
    }
  }

  const result = await blogService.deleteItemFromDb(blogId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blog and associated audio deleted successfully",
    data: result,
  });
});

const togglePinBlog = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await blogService.togglePinInDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Pin status updated successfully",
    data: result,
  });
});

const getPinnedBlogs = catchAsync(async (req: Request, res: Response) => {
  const result = await blogService.getPinnedBlogsFromDb();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Pinned blogs retrieved successfully",
    data: result,
  });
});

const getAdminPinnedBlogs = catchAsync(async (req: Request, res: Response) => {
  const result = await blogService.getAdminPinnedBlogsFromDb();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin pinned blogs retrieved successfully",
    data: result,
  });
});

export const blogController = {
  createBlog,
  getBlogList,
  getPinnedBlogs,
  getAdminPinnedBlogs,
  getWebsiteBlogList,
  getBlogById,
  getWebsiteBlogById,
  updateBlog,
  deleteBlog,
  togglePinBlog,
};
