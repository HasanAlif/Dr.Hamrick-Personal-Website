import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { rssFeedController } from "./RssFeed.controller";
import { rssFeedValidation } from "./RssFeed.validation";

const router = express.Router();

router.post(
  "/add-data",
  validateRequest(rssFeedValidation.createSchema),
  rssFeedController.storeUserData
);

router.get("/", auth("ADMIN"), rssFeedController.getListFromDb);

export const rssFeedRoutes = router;
