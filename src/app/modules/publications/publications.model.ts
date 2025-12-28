import mongoose, { Document, Schema } from "mongoose";

export interface IPublications extends Document {
  _id: string;
  title: string;
  author: string;
  publicationDate: string;
  fileType?: string;
  status: boolean;
  description: string;
  coverImage?: string;
  file?: string;
  fileName?: string;
  isNotified: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PublicationsSchema = new Schema<IPublications>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      trim: true,
    },
    publicationDate: {
      type: String,
      trim: true,
    },
    fileType: {
      type: String,
      enum: ["pdf", "pptx", "docx", "txt"],
      trim: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
    coverImage: {
      type: String,
      trim: true,
    },
    file: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
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

// Index for better performance
PublicationsSchema.index({ title: 1 });
PublicationsSchema.index({ status: 1 });

// Compound index for efficient pinned sorting
PublicationsSchema.index({ isPinned: -1, createdAt: -1 });

export const Publications = mongoose.model<IPublications>(
  "Publications",
  PublicationsSchema
);
