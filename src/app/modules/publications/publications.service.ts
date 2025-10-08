import mongoose from "mongoose";
import { Publications } from "./publications.model";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { paginationHelper } from "../../../helpers/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";

const createIntoDb = async (publicationData: any) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const sanitizedPublicationData = {
      title: publicationData.title,
      author: publicationData.author,
      publicationDate: publicationData.publicationDate,
      fileType: publicationData.fileType,
      description: publicationData.description,
      status:
        publicationData.status !== undefined
          ? Boolean(publicationData.status)
          : true,
      coverImage: publicationData.coverImage,
      file: publicationData.file,
    };

    const result = await Publications.create([sanitizedPublicationData], {
      session,
    });

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

  let query: any = {};

  // Add search term if provided
  if (searchTerm) {
    query.$or = [
      { title: { $regex: searchTerm, $options: "i" } },
      { author: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
    ];
  }

  // Add other filters if provided
  if (filterData.status !== undefined) {
    query.status = filterData.status;
  }

  // Execute the query with pagination
  const result = await Publications.find(query)
    .sort({ [sortBy || "createdAt"]: sortOrder === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(limit);

  // Get total count for pagination metadata
  const total = await Publications.countDocuments(query);

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

const getWebsitePublicationsList = async (
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

  const result = await Publications.find({ ...whereConditions, status: true })
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Publications.countDocuments({
    ...whereConditions,
    status: true,
  });

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
  const result = await Publications.findById(id);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Publication not found");
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
      ...(data.author && { author: data.author }),
      ...(data.publicationDate && { publicationDate: data.publicationDate }),
      ...(data.fileType && { fileType: data.fileType }),
      ...(data.description && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.coverImage && { coverImage: data.coverImage }),
      ...(data.file && { file: data.file }),
      updatedAt: new Date(),
    };

    const result = await Publications.findByIdAndUpdate(
      id,
      sanitizedUpdateData,
      { new: true, session }
    );

    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, "Publication not found");
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

    // First, find the publication to get file URLs
    const publication = await Publications.findById(id);

    if (!publication) {
      throw new ApiError(httpStatus.NOT_FOUND, "Publication not found");
    }

    // Import fileUploader dynamically to avoid circular dependency
    const { fileUploader } = await import("../../../helpers/fileUploader");

    // If there's a cover image, delete it from Cloudinary
    if (publication.coverImage) {
      try {
        await fileUploader.deleteFromCloudinary(publication.coverImage);
      } catch (cloudinaryError) {
        console.error(
          "Error deleting cover image from Cloudinary:",
          cloudinaryError
        );
        // Continue with deletion even if Cloudinary deletion fails
      }
    }

    // If there's a file, delete it from Cloudinary
    if (publication.file) {
      try {
        await fileUploader.deleteFromCloudinary(publication.file);
      } catch (cloudinaryError) {
        console.error("Error deleting file from Cloudinary:", cloudinaryError);
        // Continue with deletion even if Cloudinary deletion fails
      }
    }

    // Now delete the publication from database
    const result = await Publications.findByIdAndDelete(id);

    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const publicationsService = {
  createIntoDb,
  getListFromDb,
  getWebsitePublicationsList,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
};
