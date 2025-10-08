import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { publicationsService } from "./publications.service";
import { Request, Response } from "express";
import { fileUploader } from "../../../helpers/fileUploader";
const createPublications = catchAsync(async (req, res) => {
  const publicationData = req.body;

  // Convert status string to boolean if it exists
  if (publicationData.status !== undefined) {
    if (typeof publicationData.status === "string") {
      publicationData.status = publicationData.status === "true" ? true : false;
    }
  }

  // Process files if they exist using req.files as any
  const files = req.files as any;
  if (files) {
    try {
      // Handle cover image
      if (files["coverImage"] && files["coverImage"][0]) {
        const coverImageResult = await fileUploader.uploadToCloudinary(
          files["coverImage"][0],
          "publications/covers"
        );
        publicationData.coverImage = coverImageResult.Location;
      }

      // Handle publication file (PDF, etc.)
      if (files["file"] && files["file"][0]) {
        const fileResult = await fileUploader.uploadToCloudinary(
          files["file"][0],
          "publications/files"
        );
        publicationData.file = fileResult.Location;

        // Set the fileType based on the uploaded file extension
        const fileName = files["file"][0].originalname;
        const fileExt = fileName.split(".").pop()?.toLowerCase();
        if (
          fileExt &&
          ["pdf", "xlsx", "pptx", "docx", "txt"].includes(fileExt)
        ) {
          publicationData.fileType = fileExt;
        }
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      throw new Error("Error uploading files. Please try again.");
    }
  }

  const result = await publicationsService.createIntoDb(publicationData);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Publication created successfully",
    data: result,
  });
});

const getPublicationsList = catchAsync(async (req: Request, res: Response) => {
  const { searchTerm, status, page, limit, sortBy, sortOrder } = req.query;

  console.log("Query params:", { searchTerm, status, page, limit });

  const filters = {
    searchTerm: searchTerm as string,
  };

  const paginationOptions = {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string,
    sortOrder: sortOrder as string,
  };

  const result = await publicationsService.getListFromDb(
    filters,
    paginationOptions
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Publications list retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getPublicationsById = catchAsync(async (req, res) => {
  const result = await publicationsService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Publications details retrieved successfully",
    data: result,
  });
});

const updatePublications = catchAsync(async (req, res) => {
  const updateData = req.body;

  if (updateData.status !== undefined) {
    if (typeof updateData.status === "string") {
      updateData.status = updateData.status === "true" ? true : false;
    }
  }

  const files = req.files as any;
  if (files) {
    try {
      if (files["coverImage"] && files["coverImage"][0]) {
        const coverImageResult = await fileUploader.uploadToCloudinary(
          files["coverImage"][0],
          "publications/covers"
        );
        updateData.coverImage = coverImageResult.Location;
      }

      if (files["file"] && files["file"][0]) {
        const fileResult = await fileUploader.uploadToCloudinary(
          files["file"][0],
          "publications/files"
        );
        updateData.file = fileResult.Location;

        const fileName = files["file"][0].originalname;
        const fileExt = fileName.split(".").pop()?.toLowerCase();
        if (
          fileExt &&
          ["pdf", "xlsx", "pptx", "docx", "txt"].includes(fileExt)
        ) {
          updateData.fileType = fileExt;
        }
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      throw new Error("Error uploading files. Please try again.");
    }
  }

  const result = await publicationsService.updateIntoDb(
    req.params.id,
    updateData
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Publication updated successfully",
    data: result,
  });
});

const deletePublications = catchAsync(async (req, res) => {
  const result = await publicationsService.deleteItemFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Publications deleted successfully",
    data: result,
  });
});

export const publicationsController = {
  createPublications,
  getPublicationsList,
  getPublicationsById,
  updatePublications,
  deletePublications,
};
