import mongoose, { Document, Schema } from "mongoose";

export enum ContentType {
  ABOUT_US = "about-us",
  PRIVACY_POLICY = "privacy-policy",
}

export interface IWebsiteContent extends Document {
  _id: string;
  type: ContentType;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebsiteContentSchema = new Schema<IWebsiteContent>(
  {
    type: {
      type: String,
      enum: Object.values(ContentType),
      required: [true, "Content type is required"],
      unique: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better performance
WebsiteContentSchema.index({ type: 1 });

export const WebsiteContent = mongoose.model<IWebsiteContent>(
  "WebsiteContent",
  WebsiteContentSchema
);
