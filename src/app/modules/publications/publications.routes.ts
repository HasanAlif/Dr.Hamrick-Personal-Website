import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { publicationsController } from "./publications.controller";
import { publicationsValidation } from "./publications.validation";
import { UserRole } from "../../models";
import { fileUploader } from "../../../helpers/fileUploader";

const router = express.Router();

// Custom upload middleware for publications with both coverImage and file
const publicationsUploadMiddleware = fileUploader.upload.fields([
  { name: "coverImage", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

router.post(
  "/create",
  auth(UserRole.ADMIN),
  publicationsUploadMiddleware,
  validateRequest(publicationsValidation.createSchema),
  publicationsController.createPublications
);

router.get("/", publicationsController.getPublicationsList);

router.get("/pinned", publicationsController.getPinnedPublications);

router.get(
  "/website-publications",
  publicationsController.getWebsitePublicationsList
);

router.get("/:id", publicationsController.getPublicationsById);

router.put(
  "/update/:id",
  auth(UserRole.ADMIN),
  publicationsUploadMiddleware,
  validateRequest(publicationsValidation.updateSchema),
  publicationsController.updatePublications
);

router.delete(
  "/delete/:id",
  auth(UserRole.ADMIN),
  publicationsController.deletePublications
);

router.patch(
  "/pin/:id",
  auth(UserRole.ADMIN),
  publicationsController.togglePinPublication
);

export const publicationsRoutes = router;
