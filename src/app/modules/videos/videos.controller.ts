import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { videosService } from "./videos.service";
import { Request, Response } from "express";
import { googleCloudStorage } from "../../../helpers/googleCloudStorage";
import ApiError from "../../../errors/ApiErrors";
import { getVideoDuration } from "../../../helpers/videoHelper";
import { VideoStatus } from "./videos.model";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
  files?:
    | { [fieldname: string]: Express.Multer.File[] }
    | Express.Multer.File[];
}

// Create/Upload a new video with enhanced error handling for 5GB files
const createVideo = catchAsync(async (req: MulterRequest, res: Response) => {
  const videoData = req.body;

  // Get video file from files object
  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
  const videoFile = files?.["video"]?.[0];
  const thumbnailFile = files?.["thumbnail"]?.[0] || files?.["coverImage"]?.[0];

  // Validate video file upload
  if (!videoFile) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Video file is required");
  }

  // Validate file exists (either buffer or path)
  const hasBuffer = videoFile.buffer && videoFile.buffer.length > 0;
  const hasPath = videoFile.path && require('fs').existsSync(videoFile.path);
  
  if (!hasBuffer && !hasPath) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Uploaded video file is empty or invalid");
  }

  if (videoFile.size > 5368709120) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `File size (${(videoFile.size / (1024 * 1024 * 1024)).toFixed(
        2
      )}GB) exceeds maximum limit of 5GB`
    );
  }

  // Validate required fields from form-data
  if (!videoData.title || videoData.title.trim().length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Video title is required");
  }

  if (videoData.title.trim().length > 200) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Title cannot exceed 200 characters"
    );
  }

  if (!videoData.uploadDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Upload date is required");
  }

  // Validate uploadDate format
  const uploadDateParsed = Date.parse(videoData.uploadDate);
  if (isNaN(uploadDateParsed)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T10:00:00Z)"
    );
  }

  // Validate optional fields
  if (videoData.description && videoData.description.length > 5000) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Description cannot exceed 5000 characters"
    );
  }

  if (videoData.transcription && videoData.transcription.length > 50000) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Transcription cannot exceed 50000 characters"
    );
  }

  if (videoData.duration) {
    const duration = parseFloat(videoData.duration);
    if (isNaN(duration) || duration < 0 || duration > 86400) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Duration must be a positive number and cannot exceed 24 hours"
      );
    }
  }

  console.log(
    `📤 Uploading video: ${videoFile.originalname} (${(
      videoFile.size /
      (1024 * 1024)
    ).toFixed(2)}MB)`
  );

  try {
    // Extract video duration from buffer (before upload)
    // Skip for large files (>500MB) or files on disk to save memory
    let videoDuration = 0;
    try {
      // Only extract duration if file is in memory and small enough
      if (videoFile.buffer && videoFile.size <= 500 * 1024 * 1024) {
        videoDuration = await getVideoDuration(videoFile.buffer, videoFile.size);
      } else {
        videoDuration = videoData.duration ? Number(videoData.duration) : 0;
      }
    } catch (durationError) {
      console.warn("⚠️  Could not extract duration, using provided value or 0");
      videoDuration = videoData.duration ? Number(videoData.duration) : 0;
    }

    // Parallelize video and thumbnail uploads for better performance
    const uploadPromises: Promise<any>[] = [
      googleCloudStorage.uploadVideo(videoFile),
    ];

    if (thumbnailFile) {
      
      const thumbnailUploadPromise = import("../../../helpers/fileUploader")
        .then(({ fileUploader }) =>
          fileUploader.uploadToCloudinary(thumbnailFile, "video-thumbnails")
        )
        .then(result => {
          // Clean up temp thumbnail file if it exists
          if (thumbnailFile.path && require('fs').existsSync(thumbnailFile.path)) {
            require('fs').unlink(thumbnailFile.path, (err: any) => {
              if (err) console.error('Error deleting temp thumbnail:', err);
            });
          }
          return result;
        })
        .catch(err => {
          // Clean up temp thumbnail file on error
          if (thumbnailFile.path && require('fs').existsSync(thumbnailFile.path)) {
            require('fs').unlink(thumbnailFile.path, (unlinkErr: any) => {
              if (unlinkErr) console.error('Error deleting temp thumbnail:', unlinkErr);
            });
          }
          throw err;
        });
      
      uploadPromises.push(thumbnailUploadPromise);
    }

    // Wait for all uploads to complete concurrently
    const uploadResults = await Promise.all(uploadPromises);
    const uploadResult = uploadResults[0];
    const thumbnailUrl = uploadResults[1]?.Location || "";

    // Prepare video data with proper type conversions
    const newVideoData = {
      title: videoData.title?.trim(),
      description: videoData.description?.trim() || "",
      transcription: videoData.transcription?.trim() || "",
      uploadDate: videoData.uploadDate,
      status:
        videoData.status === "unpublished"
          ? VideoStatus.UNPUBLISHED
          : VideoStatus.PUBLISHED, // Default to published
      duration: videoDuration, // Use extracted duration
      videoUrl: uploadResult.publicUrl,
      signedUrl: uploadResult.signedUrl, // Store signed URL for frontend
      thumbnailUrl: thumbnailUrl || undefined,
      fileName: uploadResult.fileName,
      fileSize: uploadResult.fileSize,
      contentType: uploadResult.contentType,
    };

    // Save to database with transaction
    const result = await videosService.createIntoDb(newVideoData);

    console.log(`Video uploaded and saved: ${result._id}`);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Video uploaded successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Error uploading video:", {
      error: error.message,
      fileName: videoFile.originalname,
      fileSize: videoFile.size,
    });

    // Provide specific, actionable error messages
    if (error.message?.includes("timeout") || error.message?.includes("Timeout")) {
      throw new ApiError(
        httpStatus.REQUEST_TIMEOUT,
        `Upload timeout: The ${(videoFile.size / (1024 * 1024 * 1024)).toFixed(2)}GB file took too long to upload. This can happen with slow internet connections. Please try again or use a faster connection.`
      );
    } else if (error.message?.includes("ENOBUFS")) {
      throw new ApiError(
        httpStatus.SERVICE_UNAVAILABLE,
        "Network buffer overflow: The file is too large for your current connection. Please try again later or contact support if the issue persists."
      );
    } else if (error.message?.includes("Network") || error.message?.includes("ECONNRESET")) {
      throw new ApiError(
        httpStatus.SERVICE_UNAVAILABLE,
        "Network connection lost during upload. Please check your internet connection and try again."
      );
    } else if (error.message?.includes("Permission") || error.message?.includes("403")) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Storage permission error. Please contact administrator."
      );
    } else if (error.message?.includes("EPIPE")) {
      throw new ApiError(
        httpStatus.BAD_GATEWAY,
        "Connection was interrupted during upload. Please try again."
      );
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to upload video. Please try again."
    );
  }
});

// Get list of all videos with filters and pagination
const getVideosList = catchAsync(async (req: Request, res: Response) => {
  const { searchTerm, status, uploadDate, page, limit, sortBy, sortOrder } =
    req.query;

  const filters = {
    searchTerm: searchTerm as string,
    status: status as string,
    uploadDate: uploadDate as string,
  };

  const paginationOptions = {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string,
    sortOrder: sortOrder as string,
  };

  // Public route - only show published videos
  const result = await videosService.getListFromDb(
    filters,
    paginationOptions,
    true // publicOnly = true
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Videos retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

// Admin route - Get all videos (published and unpublished)
const getAdminVideosList = catchAsync(async (req: Request, res: Response) => {
  const { searchTerm, status, uploadDate, page, limit, sortBy, sortOrder } =
    req.query;

  const filters = {
    searchTerm: searchTerm as string,
    status: status as string,
    uploadDate: uploadDate as string,
  };

  const paginationOptions = {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string,
    sortOrder: sortOrder as string,
  };

  // Admin route - show all videos (published and unpublished)
  const result = await videosService.getListFromDb(
    filters,
    paginationOptions,
    false // publicOnly = false
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All videos retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

// Get single video by ID (Admin preview - no view increment)
const getVideoById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Admin route - show all videos regardless of status
  const result = await videosService.getByIdFromDb(id, false, false); // incrementView=false, publicOnly=false

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Video retrieved successfully",
    data: result,
  });
});

// Watch video (Public endpoint - increments view count)
const watchVideo = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Public route - only show available videos (status: true)
  const result = await videosService.getByIdFromDb(id, true, true); // incrementView=true, publicOnly=true

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Video retrieved successfully",
    data: result,
  });
});

// Update video details with optional file replacement
const updateVideo = catchAsync(async (req: MulterRequest, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // Get files from request
  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
  const videoFile = files?.["video"]?.[0];
  const thumbnailFile = files?.["thumbnail"]?.[0] || files?.["coverImage"]?.[0];

  // Prepare file data object
  let fileData: {
    videoUrl?: string;
    signedUrl?: string;
    fileName?: string;
    fileSize?: number;
    contentType?: string;
    thumbnailUrl?: string;
    duration?: number;
  } = {};

  // Upload new video if provided
  if (videoFile) {
    // Validate video file
    const hasBuffer = videoFile.buffer && videoFile.buffer.length > 0;
    const hasPath = videoFile.path && require('fs').existsSync(videoFile.path);
    
    if (!hasBuffer && !hasPath) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Uploaded video file is empty or invalid"
      );
    }

    if (videoFile.size > 5368709120) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `File size (${(videoFile.size / (1024 * 1024 * 1024)).toFixed(
          2
        )}GB) exceeds maximum limit of 5GB`
      );
    }

    console.log(
      `📤 Uploading new video: ${videoFile.originalname} (${(
        videoFile.size /
        (1024 * 1024)
      ).toFixed(2)}MB)`
    );

    // Extract video duration from buffer
    // Skip for large files (>500MB) or files on disk to save memory
    let videoDuration = 0;
    try {
      // Only extract if file is in memory and small enough
      if (videoFile.buffer && videoFile.size <= 500 * 1024 * 1024) {
        videoDuration = await getVideoDuration(videoFile.buffer, videoFile.size);
      } else {
        console.log(`Skipping duration extraction (large file or disk storage)`);
      }
    } catch (durationError) {
      console.warn("Could not extract duration from new video");
    }

    const uploadResult = await googleCloudStorage.uploadVideo(videoFile);
    fileData.videoUrl = uploadResult.publicUrl;
    fileData.signedUrl = uploadResult.signedUrl;
    fileData.fileName = uploadResult.fileName;
    fileData.fileSize = uploadResult.fileSize;
    fileData.contentType = uploadResult.contentType;

    // Update duration if extracted successfully
    if (videoDuration > 0) {
      fileData.duration = videoDuration;
    }
  }

  // Upload new thumbnail if provided
  if (thumbnailFile) {
    console.log(`📸 Uploading new thumbnail: ${thumbnailFile.originalname}`);
    const { fileUploader } = await import("../../../helpers/fileUploader");
    
    try {
      const thumbnailUploadResult = await fileUploader.uploadToCloudinary(
        thumbnailFile,
        "video-thumbnails"
      );
      fileData.thumbnailUrl = thumbnailUploadResult.Location;
      
      // Clean up temp thumbnail file after successful upload
      if (thumbnailFile.path && require('fs').existsSync(thumbnailFile.path)) {
        require('fs').unlink(thumbnailFile.path, (err: any) => {
          if (err) console.error('Error deleting temp thumbnail:', err);
        });
      }
    } catch (uploadError) {
      // Clean up temp thumbnail file on error
      if (thumbnailFile.path && require('fs').existsSync(thumbnailFile.path)) {
        require('fs').unlink(thumbnailFile.path, (err: any) => {
          if (err) console.error('Error deleting temp thumbnail:', err);
        });
      }
      throw uploadError;
    }
  }

  // Parse and validate updateData fields
  const parsedData: any = {};

  if (updateData.title !== undefined && updateData.title.trim().length > 0) {
    if (updateData.title.trim().length > 200) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Title cannot exceed 200 characters"
      );
    }
    parsedData.title = updateData.title.trim();
  }

  if (updateData.description !== undefined) {
    if (updateData.description.length > 5000) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Description cannot exceed 5000 characters"
      );
    }
    parsedData.description = updateData.description.trim();
  }

  if (updateData.transcription !== undefined) {
    if (updateData.transcription.length > 50000) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Transcription cannot exceed 50000 characters"
      );
    }
    parsedData.transcription = updateData.transcription.trim();
  }

  if (updateData.uploadDate !== undefined) {
    const uploadDateParsed = Date.parse(updateData.uploadDate);
    if (isNaN(uploadDateParsed)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid date format");
    }
    parsedData.uploadDate = updateData.uploadDate;
  }

  if (updateData.status !== undefined) {
    parsedData.status =
      updateData.status === "unpublished"
        ? VideoStatus.UNPUBLISHED
        : VideoStatus.PUBLISHED;
  }

  if (updateData.duration !== undefined && updateData.duration !== "") {
    const duration = parseFloat(updateData.duration);
    if (isNaN(duration) || duration < 0 || duration > 86400) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Duration must be between 0 and 86400 seconds"
      );
    }
    parsedData.duration = duration;
  }

  // Merge parsed data with file data
  const mergedData = { ...parsedData, ...fileData };

  // Check if there's anything to update
  if (Object.keys(mergedData).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No valid update data provided");
  }

  const result = await videosService.updateIntoDb(id, mergedData);

  console.log(`✅ Video updated: ${result._id}`);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Video updated successfully",
    data: result,
  });
});

// Delete video by ID
const deleteVideo = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await videosService.deleteItemFromDb(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Video deleted successfully",
    data: result,
  });
});

const togglePinVideo = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await videosService.togglePinInDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Pin status updated successfully",
    data: result,
  });
});

const getPinnedVideos = catchAsync(async (req: Request, res: Response) => {
  const result = await videosService.getPinnedVideosFromDb();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Pinned videos retrieved successfully",
    data: result,
  });
});

const getAdminPinnedVideos = catchAsync(async (req: Request, res: Response) => {
  const result = await videosService.getAdminPinnedVideosFromDb();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin pinned videos retrieved successfully",
    data: result,
  });
});

export const videosController = {
  createVideo,
  getVideosList,
  getAdminVideosList,
  getVideoById,
  watchVideo,
  updateVideo,
  deleteVideo,
  togglePinVideo,
  getPinnedVideos,
  getAdminPinnedVideos,
};
