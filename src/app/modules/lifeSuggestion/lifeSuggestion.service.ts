import { LifeSuggestion, SuggestionType } from "./lifeSuggestion.model";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

// Create a single life suggestion (increase or decrease)
const createLifeSuggestion = async (data: {
  type: SuggestionType;
  content: string;
}) => {
  const result = await LifeSuggestion.create({
    type: data.type,
    content: data.content,
  });

  return result;
};

// Get all life suggestions grouped by type
const getAllLifeSuggestions = async () => {
  const suggestions = await LifeSuggestion.find()
    .sort({ createdAt: -1 })
    .lean();

  // Group by type
  const increase = suggestions
    .filter((s) => s.type === SuggestionType.INCREASE)
    .map((s) => ({
      _id: s._id,
      content: s.content,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

  const decrease = suggestions
    .filter((s) => s.type === SuggestionType.DECREASE)
    .map((s) => ({
      _id: s._id,
      content: s.content,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

  return {
    increase,
    decrease,
  };
};

// Get single life suggestion by ID
const getLifeSuggestionById = async (id: string) => {
  const suggestion = await LifeSuggestion.findById(id);

  if (!suggestion) {
    throw new ApiError(httpStatus.NOT_FOUND, "Life suggestion not found");
  }

  return suggestion;
};

// Update a life suggestion
const updateLifeSuggestion = async (id: string, content: string) => {
  const suggestion = await LifeSuggestion.findByIdAndUpdate(
    id,
    { content },
    { new: true, runValidators: true }
  );

  if (!suggestion) {
    throw new ApiError(httpStatus.NOT_FOUND, "Life suggestion not found");
  }

  return suggestion;
};

// Permanent delete a life suggestion
const deleteLifeSuggestion = async (id: string) => {
  const suggestion = await LifeSuggestion.findByIdAndDelete(id);

  if (!suggestion) {
    throw new ApiError(httpStatus.NOT_FOUND, "Life suggestion not found");
  }

  return suggestion;
};

export const lifeSuggestionService = {
  createLifeSuggestion,
  getAllLifeSuggestions,
  getLifeSuggestionById,
  updateLifeSuggestion,
  deleteLifeSuggestion,
};
