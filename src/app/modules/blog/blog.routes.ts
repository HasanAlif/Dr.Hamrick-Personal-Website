import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { blogController } from "./blog.controller";
import { blogValidation } from "./blog.validation";
import { UserRole } from "../../models";
import { fileUploader } from "../../../helpers/fileUploader";

const router = express.Router();

router.post(
  "/create-blog",
  auth(UserRole.ADMIN),
  fileUploader.upload.single("coverImage"),
  validateRequest(blogValidation.createSchema),
  blogController.createBlog
);

router.put(
  "/update/:id",
  auth(UserRole.ADMIN),
  fileUploader.upload.single("coverImage"),
  validateRequest(blogValidation.updateSchema),
  blogController.updateBlog
);

router.get("/", blogController.getBlogList);

router.get("/website-blogs", blogController.getWebsiteBlogList);

router.get("/:id", blogController.getBlogById);

router.delete("/delete/:id", auth(UserRole.ADMIN), blogController.deleteBlog);

export const blogRoutes = router;
