import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { lifeSuggestionController } from "./lifeSuggestion.controller";
import { lifeSuggestionValidation } from "./lifeSuggestion.validation";
import { UserRole } from "../../models";

const router = express.Router();

// Public route - Get all life suggestions
router.get("/", lifeSuggestionController.getAllLifeSuggestions);

// Admin routes
router.post(
  "/create",
  auth(UserRole.ADMIN),
  validateRequest(lifeSuggestionValidation.createLifeSuggestion),
  lifeSuggestionController.createLifeSuggestion
);

router.get(
  "/:id",
  auth(UserRole.ADMIN),
  lifeSuggestionController.getLifeSuggestionById
);

router.patch(
  "/:id",
  auth(UserRole.ADMIN),
  validateRequest(lifeSuggestionValidation.updateLifeSuggestion),
  lifeSuggestionController.updateLifeSuggestion
);

router.delete(
  "/:id",
  auth(UserRole.ADMIN),
  lifeSuggestionController.deleteLifeSuggestion
);

export const lifeSuggestionRoutes = router;
