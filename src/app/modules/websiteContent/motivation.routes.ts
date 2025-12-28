import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { motivationController } from "./motivation.controller";
import { motivationValidation } from "./motivation.validation";
import { UserRole } from "../../models";

const router = express.Router();

// Admin routes - all require authentication
router.post(
  "/create",
  auth(UserRole.ADMIN),
  validateRequest(motivationValidation.createSchema),
  motivationController.createMotivation
);

router.put(
  "/update/:id",
  auth(UserRole.ADMIN),
  validateRequest(motivationValidation.updateSchema),
  motivationController.updateMotivation
);

router.delete(
  "/delete/:id",
  auth(UserRole.ADMIN),
  motivationController.deleteMotivation
);

router.get("/", motivationController.getAllMotivations);

export const motivationRoutes = router;
