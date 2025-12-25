import mongoose, { Document, Schema } from "mongoose";

// Video status enum
export enum VideoStatus {
  PUBLISHED = "published",
  UNPUBLISHED = "unpublished",
}

export interface IVideo extends Document {
  _id: string;
  title: string;
  description?: string;
  transcription?: string;
  videoUrl: string;
  signedUrl?: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  duration?: number;
  uploadDate: Date;
  status: VideoStatus;
  views: number;
  isDeleted: boolean;
  isNotified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema = new Schema<IVideo>(
  {
    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
      default: "",
    },
    transcription: {
      type: String,
      trim: true,
      maxlength: [50000, "Transcription cannot exceed 50000 characters"],
      default: "",
    },
    videoUrl: {
      type: String,
      required: [true, "Video URL is required"],
    },
    signedUrl: {
      type: String,
    },
    thumbnailUrl: {
      type: String,
    },
    fileName: {
      type: String,
      required: [true, "File name is required"],
    },
    fileSize: {
      type: Number,
      required: [true, "File size is required"],
      min: [0, "File size must be positive"],
      max: [5368709120, "File size cannot exceed 5GB"],
    },
    contentType: {
      type: String,
      required: [true, "Content type is required"],
    },
    duration: {
      type: Number,
      default: 0,
      min: [0, "Duration must be positive"],
      max: [86400, "Duration cannot exceed 24 hours"],
    },
    uploadDate: {
      type: Date,
      required: [true, "Upload date is required"],
    },
    status: {
      type: String,
      enum: Object.values(VideoStatus),
      default: VideoStatus.PUBLISHED,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isNotified: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Indexes for better query performance
VideoSchema.index({ title: "text", description: "text" });
VideoSchema.index({ status: 1, isDeleted: 1 });
VideoSchema.index({ uploadDate: -1 });
VideoSchema.index({ createdAt: -1 });

// Virtual for formatted file size
VideoSchema.virtual("formattedFileSize").get(function () {
  const bytes = this.fileSize;
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
});

export const Video = mongoose.model<IVideo>("Video", VideoSchema);
