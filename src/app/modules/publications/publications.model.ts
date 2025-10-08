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
      enum: ["pdf", "xlsx", "pptx", "docx", "txt"],
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
  },
  {
    timestamps: true,
  }
);

// Index for better performance
PublicationsSchema.index({ title: 1 });
PublicationsSchema.index({ status: 1 });

export const Publications = mongoose.model<IPublications>(
  "Publications",
  PublicationsSchema
);
