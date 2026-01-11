import mongoose, { Document, Schema } from "mongoose";

export enum ContentType {
  ABOUT_US = "about-us",
  PRIVACY_POLICY = "privacy-policy",
  MOTIVATION = "motivation",
  BLOG_MOTIVATION = "blog-motivation",
  PUBLICATION_MOTIVATION = "publication-motivation",
  VIDEO_MOTIVATION = "video-motivation",
  PODCAST_MOTIVATION = "podcast-motivation",
  DISCLAIMER = "disclaimer",
  FOOTTER_TEXT_1 = "footer-text-1",
  FOOTTER_TEXT_2 = "footer-text-2",
  CONTACT_TEXT = "contact-text",
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

export const WebsiteContent = mongoose.model<IWebsiteContent>(
  "WebsiteContent",
  WebsiteContentSchema
);
