import mongoose, { Document, Schema } from "mongoose";

// Interface
export interface IMotivation extends Document {
  _id: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const MotivationSchema = new Schema<IMotivation>(
  {
    text: {
      type: String,
      required: [true, "Motivation text is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Motivation = mongoose.model<IMotivation>(
  "Motivation",
  MotivationSchema
);
