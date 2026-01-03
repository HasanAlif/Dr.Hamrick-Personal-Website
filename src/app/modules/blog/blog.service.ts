import mongoose from "mongoose";
import { Blog, BlogStatus } from "./blog.model";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { paginationHelper } from "../../../helpers/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { parseToUTC, nowUTC } from "../../../helpers/dateHelpers";

interface IBlogCreateData {
  title: string;
  description: string;
  uploadDate?: string;
  status?: BlogStatus;
  scheduledAt?: string;
  coverImage?: string;
  // Audio fields
  audioUrl?: string;
  audioSignedUrl?: string;
  audioFileName?: string;
  audioSize?: number;
  audioFormat?: string;
  audioDuration?: number;
}

const createIntoDb = async (blogData: IBlogCreateData) => {
  const sanitizedBlogData: any = {
    title: blogData.title,
    description: blogData.description,
    status: blogData.status || BlogStatus.PUBLISHED,
    coverImage: blogData.coverImage,
    // Audio fields
    audioUrl: blogData.audioUrl,
    audioSignedUrl: blogData.audioSignedUrl,
    audioFileName: blogData.audioFileName,
    audioSize: blogData.audioSize,
    audioFormat: blogData.audioFormat,
    audioDuration: blogData.audioDuration,
  };

  // Handle scheduled blogs
  if (blogData.status === BlogStatus.SCHEDULED && blogData.scheduledAt) {
    sanitizedBlogData.scheduledAt = parseToUTC(blogData.scheduledAt);
    // If uploadDate is not provided, set it to scheduledAt
    sanitizedBlogData.uploadDate = blogData.uploadDate
      ? parseToUTC(blogData.uploadDate)
      : sanitizedBlogData.scheduledAt;
  } else {
    // For non-scheduled blogs, use provided uploadDate or current UTC time
    sanitizedBlogData.uploadDate = blogData.uploadDate
      ? parseToUTC(blogData.uploadDate)
      : nowUTC();
  }

  const result = await Blog.create(sanitizedBlogData);
  return result;
};

const getListFromDb = async (
  filters: { searchTerm?: string; status?: string } = {},
  paginationOptions: IPaginationOptions = {}
) => {
  const { searchTerm, status } = filters;
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const andConditions: any[] = [];

  if (searchTerm) {
    andConditions.push({
      $or: [
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
      ],
    });
  }

  // Filter by status enum value
  if (status) {
    andConditions.push({ status: status });
  }

  andConditions.push({ isDeleted: { $ne: true } });

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const sortConditions: { [key: string]: 1 | -1 } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === "asc" ? 1 : -1;
  } else {
    sortConditions.uploadDate = -1;
    sortConditions.createdAt = -1;
  }

  let query = Blog.find(whereConditions).sort(sortConditions);

  if (limit > 0) {
    query = query.skip(skip).limit(limit);
  }

  const result = await query;
  const total = await Blog.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  };
};

const getPinnedBlogsFromDb = async () => {
  const result = await Blog.find({
    isPinned: true,
    status: BlogStatus.PUBLISHED,
  }).sort({ createdAt: -1 });

  return result;
};

const getAdminPinnedBlogsFromDb = async () => {
  const result = await Blog.find({
    isPinned: true,
  }).sort({ createdAt: -1 });

  return result;
};

const getWebsiteBlogList = async (
  filters: { searchTerm?: string } = {},
  paginationOptions: IPaginationOptions = {}
) => {
  const { searchTerm } = filters;
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const andConditions: any[] = [];

  if (searchTerm) {
    andConditions.push({
      $or: [
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
      ],
    });
  }

  // Only show published blogs on website
  andConditions.push({ status: BlogStatus.PUBLISHED });

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const sortConditions: { [key: string]: 1 | -1 } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === "asc" ? 1 : -1;
  } else {
    sortConditions.uploadDate = -1;
    sortConditions.createdAt = -1;
  }

  let query = Blog.find(whereConditions).sort(sortConditions);

  if (limit > 0) {
    query = query.skip(skip).limit(limit);
  }

  const result = await query;
  const total = await Blog.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  };
};

const getByIdFromDb = async (id: string, publicOnly: boolean = false) => {
  const result = await Blog.findById(id);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog not found");
  }

  // For public routes, only return published blogs
  if (publicOnly && result.status !== BlogStatus.PUBLISHED) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog not found");
  }

  return result;
};

interface IBlogUpdateData {
  title?: string;
  description?: string;
  uploadDate?: string;
  status?: BlogStatus;
  scheduledAt?: string | null;
  coverImage?: string;
  // Audio fields
  audioUrl?: string;
  audioSignedUrl?: string;
  audioFileName?: string;
  audioSize?: number;
  audioFormat?: string;
  audioDuration?: number;
}

const updateIntoDb = async (id: string, data: IBlogUpdateData) => {
  const existingBlog = await Blog.findById(id);
  if (!existingBlog) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog not found");
  }

  // Build update object
  const updateData: any = { updatedAt: nowUTC() };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.uploadDate !== undefined)
    updateData.uploadDate = parseToUTC(data.uploadDate);
  if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;

  // Audio fields
  if (data.audioUrl !== undefined) updateData.audioUrl = data.audioUrl;
  if (data.audioSignedUrl !== undefined)
    updateData.audioSignedUrl = data.audioSignedUrl;
  if (data.audioFileName !== undefined)
    updateData.audioFileName = data.audioFileName;
  if (data.audioSize !== undefined) updateData.audioSize = data.audioSize;
  if (data.audioFormat !== undefined) updateData.audioFormat = data.audioFormat;
  if (data.audioDuration !== undefined)
    updateData.audioDuration = data.audioDuration;

  // Handle status change
  if (data.status !== undefined) {
    updateData.status = data.status;

    // If changing to scheduled, set scheduledAt
    if (data.status === BlogStatus.SCHEDULED && data.scheduledAt) {
      updateData.scheduledAt = parseToUTC(data.scheduledAt);
    }

    // If changing to published or unpublished, clear scheduledAt
    if (data.status !== BlogStatus.SCHEDULED) {
      updateData.scheduledAt = null;
    }
  } else if (
    data.scheduledAt !== undefined &&
    existingBlog.status === BlogStatus.SCHEDULED
  ) {
    // Allow updating scheduledAt only if blog is still scheduled
    updateData.scheduledAt = data.scheduledAt
      ? parseToUTC(data.scheduledAt)
      : null;
  }

  const result = await Blog.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog not found");
  }

  return result;
};

const deleteItemFromDb = async (id: string) => {
  const blog = await Blog.findById(id);

  if (!blog) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog not found");
  }

  // Note: Audio file deletion is handled in the controller before this call
  // Cover image from Cloudinary deletion (if still using coverImage)
  if (blog.coverImage) {
    try {
      const { fileUploader } = await import("../../../helpers/fileUploader");
      await fileUploader.deleteFromCloudinary(blog.coverImage);
    } catch (cloudinaryError) {
      console.error("Error deleting image from Cloudinary:", cloudinaryError);
    }
  }

  const result = await Blog.findByIdAndDelete(id);
  return result;
};

const togglePinInDb = async (id: string) => {
  const blog = await Blog.findById(id);
  if (!blog) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog not found");
  }

  blog.isPinned = !blog.isPinned;
  await blog.save();

  return blog;
};

export const blogService = {
  createIntoDb,
  getListFromDb,
  getPinnedBlogsFromDb,
  getAdminPinnedBlogsFromDb,
  getWebsiteBlogList,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
  togglePinInDb,
};
