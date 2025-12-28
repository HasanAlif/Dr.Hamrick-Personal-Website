import express from "express";
import multer from "multer";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { UserRole } from "../../models";
import { podcastValidation } from "./podcast.validation";
import * as podcastController from "./podcast.controller";
import { fileUploader } from "../../../helpers/fileUploader";

const router = express.Router();

// Public routes
router.get("/", podcastController.getAllPodcasts);
router.get("/pinned", podcastController.getPinnedPodcasts);
router.get("/live", podcastController.getLivePodcast);
router.get("/recorded", podcastController.getRecordedPodcasts);
router.get("/:id", podcastController.getPodcast);
router.get("/status/:id", podcastController.getPodcastStatus);

// Admin-only routes
router.post(
  "/",
  auth(UserRole.ADMIN),
  fileUploader.upload.single("coverImage"),
  validateRequest(podcastValidation.createSchema),
  podcastController.createPodcast
);

router.patch(
  "/:id",
  auth(UserRole.ADMIN),
  fileUploader.upload.single("coverImage"),
  validateRequest(podcastValidation.updateSchema),
  podcastController.updatePodcast
);

router.delete("/:id", auth(UserRole.ADMIN), podcastController.deletePodcast);

router.post("/start/:id", auth(UserRole.ADMIN), podcastController.startPodcast);

router.post("/end/:id", auth(UserRole.ADMIN), podcastController.endPodcast);

router.patch(
  "/pin/:id",
  auth(UserRole.ADMIN),
  podcastController.togglePinPodcast
);

export const podcastRoutes = router;
