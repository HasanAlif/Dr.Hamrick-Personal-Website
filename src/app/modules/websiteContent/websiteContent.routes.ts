import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { websiteContentController } from "./websiteContent.controller";
import { websiteContentValidation } from "./websiteContent.validation";
import { UserRole } from "../../models";

const router = express.Router();

// Public routes - accessible without authentication
router.get("/", websiteContentController.getAllContent);
router.get("/:type", websiteContentController.getContentByType);

// Admin routes - require authentication
router.patch(
  "/:type",
  auth(UserRole.ADMIN),
  validateRequest(websiteContentValidation.updateSchema),
  websiteContentController.createOrUpdateContent
);

router.delete(
  "/:type",
  auth(UserRole.ADMIN),
  websiteContentController.deleteContentByType
);

export const websiteContentRoutes = router;
