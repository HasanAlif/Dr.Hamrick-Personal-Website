import mongoose, { Document, Schema } from "mongoose";

export enum SuggestionType {
  INCREASE = "increase",
  DECREASE = "decrease",
}

export interface ILifeSuggestion extends Document {
  _id: string;
  type: SuggestionType;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const LifeSuggestionSchema = new Schema<ILifeSuggestion>(
  {
    type: {
      type: String,
      enum: Object.values(SuggestionType),
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better performance
LifeSuggestionSchema.index({ type: 1 });

export const LifeSuggestion = mongoose.model<ILifeSuggestion>(
  "LifeSuggestion",
  LifeSuggestionSchema
);
