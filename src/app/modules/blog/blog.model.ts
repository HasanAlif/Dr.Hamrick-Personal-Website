import mongoose, { Document, Schema } from "mongoose";

// Blog status enum
export enum BlogStatus {
  PUBLISHED = "published",
  UNPUBLISHED = "unpublished",
  SCHEDULED = "scheduled",
}

export interface IBlog extends Document {
  _id: string;
  title: string;
  uploadDate: Date;
  status: BlogStatus;
  scheduledAt?: Date;
  description: string;
  coverImage?: string;
  // Audio fields for GCS storage
  audioUrl?: string;
  audioSignedUrl?: string;
  audioFileName?: string;
  audioSize?: number;
  audioFormat?: string;
  audioDuration?: number;
  isNotified: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    uploadDate: {
      type: Date,
      required: [true, "Upload date is required"],
    },
    status: {
      type: String,
      enum: Object.values(BlogStatus),
      default: BlogStatus.PUBLISHED,
      index: true,
    },
    scheduledAt: {
      type: Date,
      default: null,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    coverImage: {
      type: String,
      trim: true,
    },
    // Audio fields for GCS storage
    audioUrl: {
      type: String,
      trim: true,
    },
    audioSignedUrl: {
      type: String,
      trim: true,
    },
    audioFileName: {
      type: String,
      trim: true,
    },
    audioSize: {
      type: Number,
      min: 0,
    },
    audioFormat: {
      type: String,
      trim: true,
    },
    audioDuration: {
      type: Number,
      min: 0,
    },
    isNotified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient CRON job queries
BlogSchema.index({ status: 1, scheduledAt: 1 });

// Index for better search performance
BlogSchema.index({ title: 1 });

// Index for audio file refresh queries
BlogSchema.index({ audioFileName: 1 });

// Compound index for efficient pinned sorting
BlogSchema.index({ isPinned: -1, createdAt: -1 });

export const Blog = mongoose.model<IBlog>("Blog", BlogSchema);
