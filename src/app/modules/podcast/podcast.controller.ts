import { Request, Response, NextFunction } from "express";
import Podcast, { PodcastStatus } from "./podcast.model";
import audioStreamService from "./audioStreamService";
import catchAsync from "../../../shared/catchAsync";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import {
  generateStreamConfig,
  generateLiveStreamConfig,
  generateRecordedStreamConfig,
} from "../../../helpers/streamingConfig";
import { v4 as uuidv4 } from "uuid";
import { parseToUTC, nowUTC } from "../../../helpers/dateHelpers";

interface AuthRequest extends Request {
  user: any;
  app: any;
}

// Create new podcast - Only title required, can update other fields later
export const createPodcast = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { title } = req.body;

    // Handle cover image upload
    let coverImagePath = "";
    if (req.file) {
      const { fileUploader } = await import("../../../helpers/fileUploader");
      const uploadResult = await fileUploader.uploadToCloudinary(req.file);
      coverImagePath = uploadResult.Location;
    }

    const podcast = await Podcast.create({
      title,
      coverImage: coverImagePath,
      description: req.body.description,
      transcription: req.body.transcription,
      date: req.body.date ? parseToUTC(req.body.date) : undefined,
      admin: req.user.id,
      status: PodcastStatus.SCHEDULED,
    });

    // const populatedPodcast = await Podcast.findById(podcast._id).populate(
    //   "admin",
    //   "firstName lastName email profilePicture"
    // );

    // Generate streaming configuration
    const streamConfig = generateStreamConfig((podcast._id as any).toString());

    res.status(httpStatus.CREATED).json({
      status: "success",
      message: "Podcast created successfully",
      data: {
        podcast: {
          // ...populatedPodcast!.toObject(),
          streamConfig,
        },
      },
    });
  }
);

// Get all podcasts with filtering, pagination, and sorting
export const getAllPodcasts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, page, limit, sortBy, sortOrder, search } = req.query;

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Only apply pagination if page or limit is provided
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 0;

    // Build sort conditions - supports title, date (createdAt), and duration
    const sortConditions: { [key: string]: 1 | -1 } = {};
    if (sortBy && sortOrder) {
      const sortField = sortBy as string;
      // Map user-friendly field names to model fields
      const fieldMap: { [key: string]: string } = {
        title: "title",
        date: "date",
        createdAt: "createdAt",
        duration: "duration",
      };
      const mappedField = fieldMap[sortField] || sortField;
      sortConditions[mappedField] = sortOrder === "asc" ? 1 : -1;
    } else {
      sortConditions.date = -1; // Default: newest first
      sortConditions.createdAt = -1;
    }

    let query = Podcast.find(filter)
      .populate("admin", "firstName lastName email profilePicture")
      .sort(sortConditions);

    if (limitNum > 0) {
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const podcasts = await query;
    const total = await Podcast.countDocuments(filter);

    // Add streamConfig to each podcast
    const podcastsWithConfig = podcasts.map((podcast) => {
      const podcastObj = podcast.toObject();
      const streamConfig =
        podcast.status === PodcastStatus.LIVE && podcast.liveSessionId
          ? generateLiveStreamConfig(
              (podcast._id as any).toString(),
              podcast.liveSessionId
            )
          : podcast.status === PodcastStatus.ENDED && podcast.recordedAudioUrl
          ? generateRecordedStreamConfig(
              (podcast._id as any).toString(),
              podcast.liveSessionId || "",
              podcast.recordedAudioUrl
            )
          : generateStreamConfig((podcast._id as any).toString());

      return {
        ...podcastObj,
        streamConfig,
      };
    });

    res.status(httpStatus.OK).json({
      status: "success",
      results: podcasts.length,
      data: {
        podcasts: podcastsWithConfig,
        pagination: {
          total,
          totalPages: Math.ceil(total / limitNum),
          currentPage: pageNum,
          limit: limitNum,
        },
      },
    });
  }
);

// Get single podcast by ID
export const getPodcast = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const podcast = await Podcast.findById(req.params.id).populate(
      "admin",
      "firstName lastName email profilePicture"
    );

    if (!podcast) {
      throw new ApiError(httpStatus.NOT_FOUND, "Podcast not found");
    }

    // Refresh signed URL if podcast has recording
    if (podcast.recordedFileName) {
      try {
        const freshSignedUrl = await audioStreamService.refreshPodcastSignedUrl(
          podcast.recordedFileName
        );
        podcast.recordedSignedUrl = freshSignedUrl;
        await podcast.save();
      } catch (error) {
        console.error(
          `Error refreshing signed URL for podcast ${podcast._id}:`,
          error
        );
        // Continue with existing URL if refresh fails
      }
    }

    // Generate appropriate streamConfig based on status
    const streamConfig =
      podcast.status === PodcastStatus.LIVE && podcast.liveSessionId
        ? generateLiveStreamConfig(
            (podcast._id as any).toString(),
            podcast.liveSessionId
          )
        : podcast.status === PodcastStatus.ENDED && podcast.recordedAudioUrl
        ? generateRecordedStreamConfig(
            (podcast._id as any).toString(),
            podcast.liveSessionId || "",
            podcast.recordedSignedUrl || podcast.recordedAudioUrl
          )
        : generateStreamConfig((podcast._id as any).toString());

    const podcastObj = podcast.toObject();

    res.status(httpStatus.OK).json({
      status: "success",
      data: {
        podcast: {
          ...podcastObj,
          streamConfig,
        },
      },
    });
  }
);

// Update podcast - Can update title, description, coverImage, transcription, date, status
export const updatePodcast = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { title, description, transcription, date, status } = req.body;

    const podcast = await Podcast.findById(req.params.id);

    if (!podcast) {
      throw new ApiError(httpStatus.NOT_FOUND, "Podcast not found");
    }

    // Check authorization
    if (podcast.admin.toString() !== req.user.id && req.user.role !== "ADMIN") {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You are not authorized to update this podcast"
      );
    }

    // Cannot update if already live
    if (podcast.status === PodcastStatus.LIVE) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Cannot update podcast while it is live"
      );
    }

    // Update fields
    if (title) podcast.title = title;
    if (description !== undefined) podcast.description = description;
    if (transcription !== undefined) podcast.transcription = transcription;
    if (date) podcast.date = parseToUTC(date);
    if (status && Object.values(PodcastStatus).includes(status)) {
      podcast.status = status;
    }

    // Update cover image if provided
    if (req.file) {
      const { fileUploader } = await import("../../../helpers/fileUploader");
      const uploadResult = await fileUploader.uploadToCloudinary(req.file);
      podcast.coverImage = uploadResult.Location;
    }

    await podcast.save();

    const updatedPodcast = await Podcast.findById(podcast._id).populate(
      "admin",
      "firstName lastName email profilePicture"
    );

    res.status(httpStatus.OK).json({
      status: "success",
      message: "Podcast updated successfully",
      data: {
        podcast: updatedPodcast,
      },
    });
  }
);

// Delete podcast
export const deletePodcast = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const podcast = await Podcast.findById(req.params.id);

    if (!podcast) {
      throw new ApiError(httpStatus.NOT_FOUND, "Podcast not found");
    }

    // Check authorization
    if (podcast.admin.toString() !== req.user.id && req.user.role !== "ADMIN") {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You are not authorized to delete this podcast"
      );
    }

    // Cannot delete if currently live
    if (podcast.status === PodcastStatus.LIVE) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Cannot delete podcast while it is live. Please end the broadcast first."
      );
    }

    await Podcast.findByIdAndDelete(req.params.id);

    res.status(httpStatus.OK).json({
      status: "success",
      message: "Podcast deleted successfully",
    });
  }
);

// Start live podcast broadcast
export const startPodcast = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const podcast = await Podcast.findById(req.params.id);

    if (!podcast) {
      throw new ApiError(httpStatus.NOT_FOUND, "Podcast not found");
    }

    // Check authorization
    if (podcast.admin.toString() !== req.user.id && req.user.role !== "ADMIN") {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You are not authorized to start this podcast"
      );
    }

    // Check if already live
    if (podcast.status === PodcastStatus.LIVE) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Podcast is already live");
    }

    // Check if already ended
    if (podcast.status === PodcastStatus.ENDED) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Cannot restart an ended podcast"
      );
    }

    // Generate unique session ID for this live stream
    const sessionId = uuidv4();

    // Start recording if enabled
    if (podcast.isRecording) {
      audioStreamService.startRecording(
        sessionId,
        podcast.audioFormat || "webm"
      );
    }

    // Update podcast status
    podcast.status = PodcastStatus.LIVE;
    podcast.actualStart = nowUTC();
    podcast.liveSessionId = sessionId;
    await podcast.save();

    // Emit Socket.IO event to notify listeners
    const io = req.app?.get("io");
    if (io) {
      io.of("/podcast").emit("podcast-started", {
        podcastId: (podcast._id as any).toString(),
        title: podcast.title,
        sessionId,
      });
    }

    // Generate live streaming configuration
    const streamConfig = generateLiveStreamConfig(
      (podcast._id as any).toString(),
      sessionId
    );

    res.status(httpStatus.OK).json({
      status: "success",
      message: "Podcast broadcast started",
      data: {
        podcast: {
          _id: podcast._id,
          title: podcast.title,
          description: podcast.description,
          coverImage: podcast.coverImage,
          status: podcast.status,
          liveSessionId: sessionId,
          actualStart: podcast.actualStart,
          currentListeners: podcast.currentListeners,
          peakListeners: podcast.peakListeners,
          isRecording: podcast.isRecording,
          streamConfig,
        },
      },
    });
  }
);

// End live podcast broadcast
export const endPodcast = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const podcast = await Podcast.findById(req.params.id);

    if (!podcast) {
      throw new ApiError(httpStatus.NOT_FOUND, "Podcast not found");
    }

    // Check authorization
    if (podcast.admin.toString() !== req.user.id && req.user.role !== "ADMIN") {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You are not authorized to end this podcast"
      );
    }

    // Check if podcast is live
    if (podcast.status !== PodcastStatus.LIVE) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Podcast is not currently live"
      );
    }

    const sessionId = podcast.liveSessionId;

    if (!sessionId) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "No active session found"
      );
    }

    // Update status immediately
    podcast.status = PodcastStatus.ENDED;
    podcast.actualEnd = nowUTC();

    if (podcast.actualStart) {
      podcast.duration = Math.round(
        (podcast.actualEnd.getTime() - podcast.actualStart.getTime()) / 60000
      );
    }

    // Upload recording to GCS if recording was enabled
    if (podcast.isRecording) {
      try {
        const uploadResult = await audioStreamService.stopRecordingAndUpload(
          sessionId,
          (podcast._id as any).toString(),
          podcast.title
        );

        podcast.recordedAudioUrl = uploadResult.publicUrl;
        podcast.recordedSignedUrl = uploadResult.signedUrl; // Store signed URL for frontend
        podcast.recordedFileName = uploadResult.fileName;
        podcast.audioSize = uploadResult.fileSize;
      } catch (error) {
        console.error("Error uploading recording:", error);
        // Continue even if upload fails
      }
    } else {
      // Cancel recording if it exists
      audioStreamService.cancelRecording(sessionId);
    }

    await podcast.save();

    // Emit Socket.IO event
    const io = req.app?.get("io");
    if (io) {
      io.of("/podcast")
        .to((podcast._id as any).toString())
        .emit("podcast-ended", {
          podcastId: (podcast._id as any).toString(),
          recordedUrl: podcast.recordedAudioUrl,
        });
    }

    // Generate streamConfig for ended podcast
    const streamConfig = generateRecordedStreamConfig(
      (podcast._id as any).toString(),
      sessionId,
      podcast.recordedAudioUrl || null
    );

    res.status(httpStatus.OK).json({
      status: "success",
      message:
        "Podcast broadcast ended successfully. Recording uploaded to Google Cloud Storage.",
      data: {
        podcast: {
          ...podcast.toObject(),
          streamConfig,
        },
      },
    });
  }
);

// Get current live podcast
export const getLivePodcast = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const livePodcast = await Podcast.findOne({
      status: PodcastStatus.LIVE,
    })
      .populate("admin", "firstName lastName email profilePicture")
      .sort("-actualStart");

    // Add streamConfig if live podcast exists
    const podcastWithConfig = livePodcast
      ? {
          ...livePodcast.toObject(),
          streamConfig: generateLiveStreamConfig(
            (livePodcast._id as any).toString(),
            livePodcast.liveSessionId || ""
          ),
        }
      : null;

    res.status(httpStatus.OK).json({
      status: "success",
      data: {
        podcast: podcastWithConfig,
      },
    });
  }
);

// Get recorded podcasts
export const getRecordedPodcasts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, sortBy, sortOrder } = req.query;

    // Only apply pagination if page or limit is provided
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 0;

    // Build sort conditions - supports title, date (actualEnd), and duration
    const sortConditions: { [key: string]: 1 | -1 } = {};
    if (sortBy && sortOrder) {
      const sortField = sortBy as string;
      // Map user-friendly field names to model fields
      const fieldMap: { [key: string]: string } = {
        title: "title",
        date: "actualEnd",
        createdAt: "createdAt",
        actualEnd: "actualEnd",
        duration: "duration",
      };
      const mappedField = fieldMap[sortField] || sortField;
      sortConditions[mappedField] = sortOrder === "asc" ? 1 : -1;
    } else {
      sortConditions.actualEnd = -1; // Default: newest first
    }

    let query = Podcast.find({
      status: PodcastStatus.ENDED,
      recordedAudioUrl: { $exists: true, $ne: null },
    })
      .populate("admin", "firstName lastName email profilePicture")
      .sort(sortConditions);

    if (limitNum > 0) {
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const podcasts = await query;

    const total = await Podcast.countDocuments({
      status: PodcastStatus.ENDED,
      recordedAudioUrl: { $exists: true, $ne: null },
    });

    // Refresh signed URLs and add streamConfig to each recorded podcast
    const podcastsWithConfig = await Promise.all(
      podcasts.map(async (podcast) => {
        try {
          if (podcast.recordedFileName) {
            const freshSignedUrl =
              await audioStreamService.refreshPodcastSignedUrl(
                podcast.recordedFileName
              );
            podcast.recordedSignedUrl = freshSignedUrl;
            await podcast.save();
          }
        } catch (error) {
          console.error(
            `Error refreshing signed URL for podcast ${podcast._id}:`,
            error
          );
          // Continue with existing URL if refresh fails
        }

        return {
          ...podcast.toObject(),
          streamConfig: generateRecordedStreamConfig(
            (podcast._id as any).toString(),
            podcast.liveSessionId || "",
            podcast.recordedSignedUrl || podcast.recordedAudioUrl || null
          ),
        };
      })
    );

    res.status(httpStatus.OK).json({
      status: "success",
      results: podcasts.length,
      data: {
        podcasts: podcastsWithConfig,
        pagination: {
          total,
          totalPages: Math.ceil(total / limitNum),
          currentPage: pageNum,
          limit: limitNum,
        },
      },
    });
  }
);

// Get podcast status
export const getPodcastStatus = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const podcast = await Podcast.findById(req.params.id);

    if (!podcast) {
      throw new ApiError(httpStatus.NOT_FOUND, "Podcast not found");
    }

    const recordingStatus = podcast.liveSessionId
      ? audioStreamService.getRecordingStatus(podcast.liveSessionId)
      : null;

    res.status(httpStatus.OK).json({
      status: "success",
      data: {
        podcastId: podcast._id,
        status: podcast.status,
        currentListeners: podcast.currentListeners,
        peakListeners: podcast.peakListeners,
        totalListeners: podcast.totalListeners,
        isLive: podcast.status === PodcastStatus.LIVE,
        recordingStatus,
      },
    });
  }
);

export const togglePinPodcast = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const podcast = await Podcast.findById(id);
    if (!podcast) {
      throw new ApiError(httpStatus.NOT_FOUND, "Podcast not found");
    }

    podcast.isPinned = !podcast.isPinned;
    await podcast.save();

    res.status(httpStatus.OK).json({
      status: "success",
      message: "Pin status updated successfully",
      data: {
        podcast,
      },
    });
  }
);

// Get pinned podcasts
export const getPinnedPodcasts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const podcasts = await Podcast.find({
      isPinned: true,
      status: PodcastStatus.ENDED,
    }).sort({ createdAt: -1 });

    res.status(httpStatus.OK).json({
      status: "success",
      message: "Pinned podcasts retrieved successfully",
      results: podcasts.length,
      data: {
        podcasts,
      },
    });
  }
);

export const getAdminPinnedPodcasts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const podcasts = await Podcast.find({
      isPinned: true,
    }).sort({ createdAt: -1 });

    res.status(httpStatus.OK).json({
      status: "success",
      message: "Pinned podcasts retrieved successfully",
      results: podcasts.length,
      data: {
        podcasts,
      },
    });
  }
);
