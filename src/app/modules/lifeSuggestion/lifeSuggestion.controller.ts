import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { lifeSuggestionService } from "./lifeSuggestion.service";

const createLifeSuggestion = catchAsync(async (req, res) => {
  const { type, content } = req.body;

  const result = await lifeSuggestionService.createLifeSuggestion({
    type,
    content,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `Life suggestion (${type}) created successfully`,
    data: result,
  });
});

const getAllLifeSuggestions = catchAsync(async (req, res) => {
  const result = await lifeSuggestionService.getAllLifeSuggestions();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Life suggestions retrieved successfully",
    data: result,
  });
});

const getLifeSuggestionById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await lifeSuggestionService.getLifeSuggestionById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Life suggestion retrieved successfully",
    data: result,
  });
});

const updateLifeSuggestion = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const result = await lifeSuggestionService.updateLifeSuggestion(id, content);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Life suggestion updated successfully",
    data: result,
  });
});

const deleteLifeSuggestion = catchAsync(async (req, res) => {
  const { id } = req.params;

  await lifeSuggestionService.deleteLifeSuggestion(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Life suggestion deleted successfully",
    data: null,
  });
});

export const lifeSuggestionController = {
  createLifeSuggestion,
  getAllLifeSuggestions,
  getLifeSuggestionById,
  updateLifeSuggestion,
  deleteLifeSuggestion,
};
