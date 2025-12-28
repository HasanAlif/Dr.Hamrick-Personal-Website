import mongoose from "mongoose";
import { Publications, IPublications } from "./publications.model";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { paginationHelper } from "../../../helpers/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { deleteFromGCS } from "../../../helpers/googleCloudStorage";

const createIntoDb = async (publicationData: any) => {
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
    fileName: publicationData.fileName,
  };

  const result = await Publications.create(sanitizedPublicationData);
  return result;
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

  // Execute the query with optional pagination
  const sortConditions: { [key: string]: 1 | -1 } = {
    isPinned: -1, // Always show pinned content first
    [sortBy || "createdAt"]: sortOrder === "asc" ? 1 : -1,
  };
  let queryExec = Publications.find(query).sort(sortConditions);

  if (limit > 0) {
    queryExec = queryExec.skip(skip).limit(limit);
  }

  const result = await queryExec;
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

  const sortConditions: { [key: string]: 1 | -1 } = {
    isPinned: -1, // Always show pinned content first
  };
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === "asc" ? 1 : -1;
  } else {
    sortConditions.createdAt = -1;
  }

  // Apply pagination only if limit is provided
  let query = Publications.find({ ...whereConditions, status: true }).sort(
    sortConditions
  );

  if (limit > 0) {
    query = query.skip(skip).limit(limit);
  }

  const result = await query;
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
  // Get existing publication first to check for old files
  const existingPublication = await Publications.findById(id);
  if (!existingPublication) {
    throw new ApiError(httpStatus.NOT_FOUND, "Publication not found");
  }

  // Store old URLs for deletion after successful update
  const oldCoverImage = existingPublication.coverImage;
  const oldFile = existingPublication.file;
  const isCoverImageReplaced = !!data.coverImage;
  const isFileReplaced = !!data.file;

  // Build update object - only include provided fields
  const sanitizedUpdateData: any = { updatedAt: new Date() };

  if (data.title !== undefined) sanitizedUpdateData.title = data.title;
  if (data.author !== undefined) sanitizedUpdateData.author = data.author;
  if (data.publicationDate !== undefined)
    sanitizedUpdateData.publicationDate = data.publicationDate;
  if (data.fileType !== undefined) sanitizedUpdateData.fileType = data.fileType;
  if (data.description !== undefined)
    sanitizedUpdateData.description = data.description;
  if (data.status !== undefined) sanitizedUpdateData.status = data.status;
  if (data.coverImage !== undefined)
    sanitizedUpdateData.coverImage = data.coverImage;
  if (data.file !== undefined) sanitizedUpdateData.file = data.file;
  if (data.fileName !== undefined) sanitizedUpdateData.fileName = data.fileName;

  const result = await Publications.findByIdAndUpdate(id, sanitizedUpdateData, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Publication not found");
  }

  // Delete old files from GCS AFTER successful database update (fire and forget)
  if (isCoverImageReplaced && oldCoverImage) {
    deleteFromGCS(oldCoverImage).catch((err) => {
      console.error("Failed to delete old cover image from GCS:", err);
    });
  }

  if (isFileReplaced && oldFile) {
    deleteFromGCS(oldFile).catch((err) => {
      console.error("Failed to delete old file from GCS:", err);
    });
  }

  return result;
};

const deleteItemFromDb = async (id: string) => {
  // First, find the publication to get file URLs
  const publication = await Publications.findById(id);

  if (!publication) {
    throw new ApiError(httpStatus.NOT_FOUND, "Publication not found");
  }

  // Delete the publication from database first
  const result = await Publications.findByIdAndDelete(id);

  // Delete files from GCS after successful database deletion (fire and forget)
  if (publication.coverImage) {
    deleteFromGCS(publication.coverImage).catch((err) => {
      console.error("Failed to delete cover image from GCS:", err);
    });
  }

  if (publication.file) {
    deleteFromGCS(publication.file).catch((err) => {
      console.error("Failed to delete file from GCS:", err);
    });
  }

  return result;
};

const togglePinInDb = async (id: string) => {
  const publication = await Publications.findById(id);
  if (!publication) {
    throw new ApiError(httpStatus.NOT_FOUND, "Publication not found");
  }

  publication.isPinned = !publication.isPinned;
  await publication.save();

  return publication;
};

export const publicationsService = {
  createIntoDb,
  getListFromDb,
  getWebsitePublicationsList,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
  togglePinInDb,
};
