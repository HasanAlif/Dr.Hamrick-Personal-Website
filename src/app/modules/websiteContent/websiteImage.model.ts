import mongoose, { Document, Schema } from "mongoose";

// Interface
export interface IWebsiteImage extends Document {
  _id: string;
  image: string; // Cloudinary URL
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const WebsiteImageSchema = new Schema<IWebsiteImage>(
  {
    image: {
      type: String,
      required: [true, "Image URL is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const WebsiteImage = mongoose.model<IWebsiteImage>(
  "WebsiteImage",
  WebsiteImageSchema
);
