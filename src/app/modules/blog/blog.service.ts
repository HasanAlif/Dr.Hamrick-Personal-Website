import mongoose from "mongoose";
import { Blog } from "./blog.model";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { paginationHelper } from "../../../helpers/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";

const createIntoDb = async (blogData: any) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const sanitizedBlogData = {
      title: blogData.title,
      description: blogData.description,
      status: blogData.status !== undefined ? blogData.status : true,
      coverImage: blogData.coverImage,
    };

    const result = await Blog.create([sanitizedBlogData], { session });

    await session.commitTransaction();
    return result[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getListFromDb = async (
  filters: { searchTerm?: string; status?: boolean } = {},
  paginationOptions: IPaginationOptions = {}
) => {
  const { searchTerm, ...filterData } = filters;
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      $or: [
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
      ],
    });
  }

  if (filterData.status !== undefined) {
    andConditions.push({ status: filterData.status });
  }

  andConditions.push({ isDeleted: { $ne: true } });

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const sortConditions: { [key: string]: 1 | -1 } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === "asc" ? 1 : -1;
  } else {
    sortConditions.createdAt = -1;
  }

  const result = await Blog.find(whereConditions)
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

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

const getWebsiteBlogList = async (
  filters: { searchTerm?: string; status?: boolean } = {},
  paginationOptions: IPaginationOptions = {}
) => {
  const { searchTerm, ...filterData } = filters;
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      $or: [
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
      ],
    });
  }

  if (filterData.status !== undefined) {
    andConditions.push({ status: filterData.status });
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const sortConditions: { [key: string]: 1 | -1 } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === "asc" ? 1 : -1;
  } else {
    sortConditions.createdAt = -1;
  }

  const result = await Blog.find({ ...whereConditions, status: true })
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Blog.countDocuments({ ...whereConditions, status: true });

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

const getByIdFromDb = async (id: string) => {
  const result = await Blog.findById(id);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog not found");
  }
  return result;
};

const updateIntoDb = async (id: string, data: any) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Sanitize update data
    const sanitizedUpdateData = {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.coverImage && { coverImage: data.coverImage }),
      updatedAt: new Date(),
    };

    const result = await Blog.findByIdAndUpdate(id, sanitizedUpdateData, {
      new: true,
      session,
    });

    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, "Blog not found");
    }

    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const deleteItemFromDb = async (id: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const blog = await Blog.findById(id);

    if (!blog) {
      throw new ApiError(httpStatus.NOT_FOUND, "Blog not found");
    }

    if (blog.coverImage) {
      try {
        const { fileUploader } = await import("../../../helpers/fileUploader");
        await fileUploader.deleteFromCloudinary(blog.coverImage);
      } catch (cloudinaryError) {
        console.error("Error deleting image from Cloudinary:", cloudinaryError);
      }
    }

    const result = await Blog.findByIdAndDelete(id);

    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const blogService = {
  createIntoDb,
  getListFromDb,
  getWebsiteBlogList,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
};
