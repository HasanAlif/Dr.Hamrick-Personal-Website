import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { blogController } from "./blog.controller";
import { blogValidation } from "./blog.validation";
import { UserRole } from "../../models";
import { fileUploader } from "../../../helpers/fileUploader";

const router = express.Router();

// Admin routes
router.post(
  "/create-blog",
  auth(UserRole.ADMIN),
  fileUploader.upload.single("audio"),
  validateRequest(blogValidation.createSchema),
  blogController.createBlog
);

router.put(
  "/update/:id",
  auth(UserRole.ADMIN),
  fileUploader.upload.single("audio"),
  validateRequest(blogValidation.updateSchema),
  blogController.updateBlog
);

router.delete("/delete/:id", auth(UserRole.ADMIN), blogController.deleteBlog);

// Admin toggle pin status
router.patch("/pin/:id", auth(UserRole.ADMIN), blogController.togglePinBlog);

// Admin list - shows all blogs with all statuses
router.get("/", blogController.getBlogList);

// Public routes - only show published blogs
router.get("/website-blogs", blogController.getWebsiteBlogList);

// Public single blog - only returns published blogs
router.get("/website-blogs/:id", blogController.getWebsiteBlogById);

// Admin single blog - returns any blog regardless of status
router.get("/:id", blogController.getBlogById);

export const blogRoutes = router;
