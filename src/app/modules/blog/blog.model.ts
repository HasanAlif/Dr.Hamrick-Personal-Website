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
  isNotified: boolean;
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
    isNotified: {
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

export const Blog = mongoose.model<IBlog>("Blog", BlogSchema);
