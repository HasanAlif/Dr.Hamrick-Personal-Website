import httpStatus from "http-status";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import { publicationsService } from "./publications.service";
import { Request, Response } from "express";
import { googleCloudStorage } from "../../../helpers/googleCloudStorage";

const createPublications = catchAsync(async (req, res) => {
  const publicationData = req.body;

  // Convert status string to boolean if it exists
  if (publicationData.status !== undefined) {
    if (typeof publicationData.status === "string") {
      publicationData.status = publicationData.status === "true" ? true : false;
    }
  }

  // Process files if they exist
  const files = req.files as any;
  if (files) {
    try {
      // Handle cover image - upload to GCS
      if (files["coverImage"] && files["coverImage"][0]) {
        console.log(
          `Uploading cover image: ${files["coverImage"][0].originalname}`
        );
        const coverImageResult =
          await googleCloudStorage.uploadPublicationImage(
            files["coverImage"][0],
            "covers"
          );
        publicationData.coverImage = coverImageResult.signedUrl;
      }

      // Handle publication file (PDF, etc.) - upload to GCS
      if (files["file"] && files["file"][0]) {
        console.log(`Uploading document: ${files["file"][0].originalname}`);
        const fileResult = await googleCloudStorage.uploadDocument(
          files["file"][0],
          "files"
        );
        publicationData.file = fileResult.signedUrl;
        publicationData.fileName = fileResult.fileName;

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
    } catch (error: any) {
      console.error("Error uploading files:", error);
      throw new Error(
        error.message || "Error uploading files. Please try again."
      );
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

const getWebsitePublicationsList = catchAsync(
  async (req: Request, res: Response) => {
    const { searchTerm, status, page, limit, sortBy, sortOrder } = req.query;

    const filters = {
      searchTerm: searchTerm as string,
      status: status !== undefined ? status === "true" : undefined,
    };

    const paginationOptions = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as string,
    };

    const result = await publicationsService.getWebsitePublicationsList(
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
  }
);

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
      // Handle cover image - upload to GCS
      if (files["coverImage"] && files["coverImage"][0]) {
        console.log(
          `Uploading new cover image: ${files["coverImage"][0].originalname}`
        );
        const coverImageResult =
          await googleCloudStorage.uploadPublicationImage(
            files["coverImage"][0],
            "covers"
          );
        updateData.coverImage = coverImageResult.signedUrl;
      }

      // Handle publication file (PDF, etc.) - upload to GCS
      if (files["file"] && files["file"][0]) {
        console.log(`Uploading new document: ${files["file"][0].originalname}`);
        const fileResult = await googleCloudStorage.uploadDocument(
          files["file"][0],
          "files"
        );
        updateData.file = fileResult.signedUrl;
        updateData.fileName = fileResult.fileName;

        const fileName = files["file"][0].originalname;
        const fileExt = fileName.split(".").pop()?.toLowerCase();
        if (
          fileExt &&
          ["pdf", "xlsx", "pptx", "docx", "txt"].includes(fileExt)
        ) {
          updateData.fileType = fileExt;
        }
      }
    } catch (error: any) {
      console.error("Error uploading files:", error);
      throw new Error(
        error.message || "Error uploading files. Please try again."
      );
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

const togglePinPublication = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await publicationsService.togglePinInDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Pin status updated successfully",
    data: result,
  });
});

const getPinnedPublications = catchAsync(
  async (req: Request, res: Response) => {
    const result = await publicationsService.getPinnedPublicationsFromDb();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Pinned publications retrieved successfully",
      data: result,
    });
  }
);

export const publicationsController = {
  createPublications,
  getPublicationsList,
  getWebsitePublicationsList,
  getPublicationsById,
  updatePublications,
  deletePublications,
  togglePinPublication,
  getPinnedPublications,
};
