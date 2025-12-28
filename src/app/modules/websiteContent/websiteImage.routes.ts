import express from "express";
import auth from "../../middlewares/auth";
import { websiteImageController } from "./websiteImage.controller";
import { UserRole } from "../../models";
import { fileUploader } from "../../../helpers/fileUploader";

const router = express.Router();

// Admin routes - all require authentication
router.post(
  "/create",
  auth(UserRole.ADMIN),
  fileUploader.upload.single("image"),
  websiteImageController.createWebsiteImage
);

router.put(
  "/update/:id",
  auth(UserRole.ADMIN),
  fileUploader.upload.single("image"),
  websiteImageController.updateWebsiteImage
);

router.delete(
  "/delete/:id",
  auth(UserRole.ADMIN),
  websiteImageController.deleteWebsiteImage
);

router.get("/", websiteImageController.getAllWebsiteImages);

export const websiteImageRoutes = router;
