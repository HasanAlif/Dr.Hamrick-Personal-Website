import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { rssFeedService } from "./RssFeed.service";
import { Request, Response } from "express";

const storeUserData = catchAsync(async (req: Request, res: Response) => {
  const rssFeedData = req.body;
  const result = await rssFeedService.storeUserData(rssFeedData);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User data stored successfully",
    data: result,
  });
});

const getListFromDb = catchAsync(async (req: Request, res: Response) => {
  const result = await rssFeedService.getListFromDb();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "RSS feed list retrieved successfully",
    data: result,
  });
});

export const rssFeedController = {
  storeUserData,
  getListFromDb,
};
