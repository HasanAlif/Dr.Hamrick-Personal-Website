import mongoose from "mongoose";
import { Video, IVideo, VideoStatus } from "./videos.model";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelper } from "../../../helpers/paginationHelper";
import {
  deleteFromGCS,
  refreshSignedUrl,
} from "../../../helpers/googleCloudStorage";

interface IVideoFilter {
  searchTerm?: string;
  status?: string;
  uploadDateFrom?: string;
  uploadDateTo?: string;
}

const createIntoDb = async (data: Partial<IVideo>) => {
  // Convert uploadDate string to Date if needed
  if (data.uploadDate && typeof data.uploadDate === "string") {
    data.uploadDate = new Date(data.uploadDate);
  }

  // Sanitize HTML content if needed
  if (data.description) {
    data.description = data.description.trim();
  }
  if (data.transcription) {
    data.transcription = data.transcription.trim();
  }

  const result = await Video.create(data);
  return result;
};

const getListFromDb = async (
  filters: IVideoFilter,
  paginationOptions: IPaginationOptions,
  publicOnly: boolean = false
) => {
  const { searchTerm, status, uploadDateFrom, uploadDateTo } = filters;

  const andConditions = [];

  // Search by title or description
  if (searchTerm) {
    andConditions.push({
      $or: [
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
      ],
    });
  }

  // Filter by status
  if (publicOnly) {
    // For public routes, only show published videos
    andConditions.push({ status: VideoStatus.PUBLISHED });
  } else if (status !== undefined) {
    // For admin routes, allow filtering by status
    andConditions.push({ status: status });
  }

  // Filter by upload date range
  if (uploadDateFrom || uploadDateTo) {
    const dateFilter: any = {};
    if (uploadDateFrom) {
      dateFilter.$gte = new Date(uploadDateFrom);
    }
    if (uploadDateTo) {
      dateFilter.$lte = new Date(uploadDateTo);
    }
    andConditions.push({ uploadDate: dateFilter });
  }

  // Always exclude deleted videos
  andConditions.push({ isDeleted: false });

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  // Pagination
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const sortConditions: { [key: string]: 1 | -1 } = {
    isPinned: -1, // Always show pinned content first
  };
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === "asc" ? 1 : -1;
  } else {
    sortConditions.uploadDate = -1; // Default: newest first
  }

  // Apply pagination only if limit is provided
  let query = Video.find(whereConditions).sort(sortConditions);

  if (limit > 0) {
    query = query.skip(skip).limit(limit);
  }

  const result = await query;
  const total = await Video.countDocuments(whereConditions);

  // Refresh signed URLs for all videos (return modified objects, don't save to DB)
  const videosWithFreshUrls = await Promise.all(
    result.map(async (video) => {
      try {
        const freshSignedUrl = await refreshSignedUrl(video.fileName);
        // Update in-memory object only, no database write
        const videoObj = video.toObject();
        videoObj.signedUrl = freshSignedUrl;
        return videoObj;
      } catch (error) {
        console.error(
          `Error refreshing signed URL for video ${video._id}:`,
          error
        );
        return video.toObject(); // Return video with old URL if refresh fails
      }
    })
  );

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: videosWithFreshUrls,
  };
};

const getByIdFromDb = async (
  id: string,
  incrementView: boolean = false,
  publicOnly: boolean = false
) => {
  const result = await Video.findById(id);

  if (!result || result.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, "Video not found");
  }

  // For public routes, only return published videos
  if (publicOnly && result.status !== VideoStatus.PUBLISHED) {
    throw new ApiError(httpStatus.NOT_FOUND, "Video not found");
  }

  // View increment
  if (incrementView) {
    await Video.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: false });
    result.views += 1; // Update local object for response
  }

  // Refresh signed URL if fileName exists
  try {
    const freshSignedUrl = await refreshSignedUrl(result.fileName);
    result.signedUrl = freshSignedUrl;
  } catch (error) {
    console.error(
      `Error refreshing signed URL for video ${result._id}:`,
      error
    );
  }

  return result;
};

// Interface for update data including file fields
interface IVideoUpdateData {
  title?: string;
  description?: string;
  transcription?: string;
  uploadDate?: string | Date;
  status?: VideoStatus;
  duration?: number;
  videoUrl?: string;
  signedUrl?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  thumbnailUrl?: string;
}

const updateIntoDb = async (id: string, data: IVideoUpdateData) => {
  // Get existing video first
  const existingVideo = await Video.findById(id);
  if (!existingVideo || existingVideo.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, "Video not found");
  }

  // Store old URLs for deletion after successful update
  const oldVideoUrl = existingVideo.videoUrl;
  const oldThumbnailUrl = existingVideo.thumbnailUrl;
  const isVideoReplaced = !!data.videoUrl;
  const isThumbnailReplaced = !!data.thumbnailUrl;

  // Build update object - only include provided fields
  const updateData: any = {};

  // Text fields
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.transcription !== undefined)
    updateData.transcription = data.transcription;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.duration !== undefined) updateData.duration = data.duration;

  // Convert uploadDate string to Date if needed
  if (data.uploadDate !== undefined) {
    updateData.uploadDate =
      typeof data.uploadDate === "string"
        ? new Date(data.uploadDate)
        : data.uploadDate;
  }

  // File fields (only if new files were uploaded)
  if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
  if (data.signedUrl !== undefined) updateData.signedUrl = data.signedUrl;
  if (data.fileName !== undefined) updateData.fileName = data.fileName;
  if (data.fileSize !== undefined) updateData.fileSize = data.fileSize;
  if (data.contentType !== undefined) updateData.contentType = data.contentType;
  if (data.thumbnailUrl !== undefined)
    updateData.thumbnailUrl = data.thumbnailUrl;

  // Update the video in database
  const result = await Video.findByIdAndUpdate(
    id,
    { ...updateData, updatedAt: new Date() },
    { new: true, runValidators: true }
  );

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Video not found");
  }

  // Delete old files AFTER successful database update (fire and forget)
  if (isVideoReplaced && oldVideoUrl) {
    deleteFromGCS(oldVideoUrl).catch((err) => {
      console.error("Failed to delete old video from GCS:", err);
    });
  }

  if (isThumbnailReplaced && oldThumbnailUrl) {
    import("../../../helpers/fileUploader").then(({ fileUploader }) => {
      fileUploader.deleteFromCloudinary(oldThumbnailUrl).catch((err: any) => {
        console.error("Failed to delete old thumbnail from Cloudinary:", err);
      });
    });
  }

  return result;
};

const deleteItemFromDb = async (id: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Get video details first
    const video = await Video.findById(id);
    if (!video) {
      throw new ApiError(httpStatus.NOT_FOUND, "Video not found");
    }

    // Soft delete in database
    const result = await Video.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true, session }
    );

    await session.commitTransaction();

    // Delete from Google Cloud Storage (async, don't block response)
    try {
      if (video.videoUrl) {
        await deleteFromGCS(video.videoUrl);
      }
      if (video.thumbnailUrl) {
        await deleteFromGCS(video.thumbnailUrl);
      }
    } catch (gcsError) {
      console.error("Failed to delete from GCS:", gcsError);
      // Continue - database soft delete succeeded
    }

    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const togglePinInDb = async (id: string) => {
  const video = await Video.findById(id);
  if (!video) {
    throw new ApiError(httpStatus.NOT_FOUND, "Video not found");
  }

  video.isPinned = !video.isPinned;
  await video.save();

  return video;
};

export const videosService = {
  createIntoDb,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
  togglePinInDb,
};
