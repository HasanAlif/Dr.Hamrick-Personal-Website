import express, { Request, Response, NextFunction } from "express";
import multer from "multer";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { videosController } from "./videos.controller";
import { videosValidation } from "./videos.validation";
import { UserRole } from "../../models";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const router = express.Router();

// Multer configuration for video uploads
const storage = multer.memoryStorage(); // Store in memory for streaming to GCS

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept video files for 'video' field
  const allowedVideoMimeTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-ms-wmv",
    "video/webm",
    "video/x-matroska",
  ];

  // Accept image files for 'thumbnail' or 'coverImage' field
  const allowedImageMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (file.fieldname === "video") {
    if (allowedVideoMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new ApiError(
          httpStatus.BAD_REQUEST,
          "Only video files are allowed for video field"
        ) as any
      );
    }
  } else if (
    file.fieldname === "thumbnail" ||
    file.fieldname === "coverImage"
  ) {
    if (allowedImageMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new ApiError(
          httpStatus.BAD_REQUEST,
          "Only image files (JPEG, PNG, WebP, GIF) are allowed for thumbnail"
        ) as any
      );
    }
  } else {
    cb(
      new ApiError(
        httpStatus.BAD_REQUEST,
        `Unexpected field: ${file.fieldname}`
      ) as any
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxVideoSize, // 5GB from config (applies to video)
    fieldSize: 10 * 1024 * 1024, // 10MB for text fields
  },
});

// Multer error handling middleware
const handleMulterError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const maxSizeGB = (
        config.upload.maxVideoSize /
        (1024 * 1024 * 1024)
      ).toFixed(2);
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: `File size exceeds maximum limit of ${maxSizeGB}GB`,
        errorMessages: [
          {
            path: "video",
            message: `Maximum allowed file size is ${maxSizeGB}GB`,
          },
        ],
      });
    }
    if (err.code === "LIMIT_FIELD_VALUE") {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Field value too large",
        errorMessages: [
          { path: err.field, message: "Field value exceeds limit" },
        ],
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Unexpected field in upload",
        errorMessages: [{ path: err.field, message: "Unexpected file field" }],
      });
    }
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: err.message,
      errorMessages: [{ path: "video", message: err.message }],
    });
  }
  next(err);
};

router.post(
  "/upload",
  auth(UserRole.ADMIN),
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }, // Alternative field name
  ]),
  handleMulterError,
  videosController.createVideo
);

router.get("/", videosController.getVideosList);

router.get("/pinned", videosController.getPinnedVideos);

router.get(
  "/admin-pinned",
  auth(UserRole.ADMIN),
  videosController.getAdminPinnedVideos
);

router.get("/admin", auth(UserRole.ADMIN), videosController.getAdminVideosList);

router.get("/watch/:id", videosController.watchVideo);

// RESTful routes with specific paths before generic /:id
router.put(
  "/:id",
  auth(UserRole.ADMIN),
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  handleMulterError,
  videosController.updateVideo
);

router.delete("/:id", auth(UserRole.ADMIN), videosController.deleteVideo);

router.patch("/pin/:id", auth(UserRole.ADMIN), videosController.togglePinVideo);

router.get("/:id", videosController.getVideoById);

export const videosRoutes = router;
