import { Request, Response } from "express";
import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { motivationService } from "./motivation.service";

const createMotivation = catchAsync(async (req: Request, res: Response) => {
  const motivationData = req.body;
  const result = await motivationService.createIntoDb(motivationData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Motivation created successfully",
    data: result,
  });
});

const updateMotivation = catchAsync(async (req: Request, res: Response) => {
  const updateData = req.body;
  const motivationId = req.params.id;

  const result = await motivationService.updateIntoDb(motivationId, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Motivation updated successfully",
    data: result,
  });
});

const deleteMotivation = catchAsync(async (req: Request, res: Response) => {
  const motivationId = req.params.id;
  const result = await motivationService.deleteItemFromDb(motivationId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Motivation deleted successfully",
    data: result,
  });
});

const getAllMotivations = catchAsync(async (req: Request, res: Response) => {
  const result = await motivationService.getAllFromDb();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Motivations retrieved successfully",
    data: result,
  });
});

export const motivationController = {
  createMotivation,
  updateMotivation,
  deleteMotivation,
  getAllMotivations,
};
