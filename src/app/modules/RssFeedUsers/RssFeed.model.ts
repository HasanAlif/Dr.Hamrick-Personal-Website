import mongoose, { Schema, Document } from "mongoose";

export interface IRssFeed extends Document {
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RssFeedSchema = new Schema<IRssFeed>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

RssFeedSchema.index({ email: 1 });

export const RssFeed = mongoose.model<IRssFeed>("RssFeed", RssFeedSchema);
