import { z } from "zod";
import { BlogStatus } from "./blog.model";
import { isInFuture } from "../../../helpers/dateHelpers";

const createSchema = z.object({
  body: z
    .object({
      title: z
        .string({
          required_error: "Title is required",
        })
        .min(1, "Title cannot be empty"),
      description: z.string().min(1, "Description cannot be empty"),
      uploadDate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message:
            "Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T14:00:00Z)",
        })
        .optional(),
      status: z
        .enum([
          BlogStatus.PUBLISHED,
          BlogStatus.UNPUBLISHED,
          BlogStatus.SCHEDULED,
        ])
        .optional()
        .default(BlogStatus.PUBLISHED),
      scheduledAt: z
        .string()
        .refine((val) => !val || !isNaN(Date.parse(val)), {
          message:
            "Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T14:00:00Z)",
        })
        .optional(),
      coverImage: z.string().optional(),
      // Audio fields (these are set by controller after upload, not from body)
      audioUrl: z.string().optional(),
      audioSignedUrl: z.string().optional(),
      audioFileName: z.string().optional(),
      audioSize: z.number().optional(),
      audioFormat: z.string().optional(),
      audioDuration: z.number().optional(),
    })
    .refine(
      (data) => {
        // If status is scheduled, scheduledAt must be provided and in the future (UTC comparison)
        if (data.status === BlogStatus.SCHEDULED) {
          if (!data.scheduledAt) return false;
          return isInFuture(data.scheduledAt);
        }
        return true;
      },
      {
        message: "Scheduled blogs require a future date and time (UTC)",
        path: ["scheduledAt"],
      }
    ),
});

const updateSchema = z.object({
  body: z
    .object({
      title: z.string().min(1, "Title cannot be empty").optional(),
      description: z.string().min(1, "Description cannot be empty").optional(),
      uploadDate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message:
            "Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T14:00:00Z)",
        })
        .optional(),
      status: z
        .enum([
          BlogStatus.PUBLISHED,
          BlogStatus.UNPUBLISHED,
          BlogStatus.SCHEDULED,
        ])
        .optional(),
      scheduledAt: z
        .string()
        .refine((val) => !val || !isNaN(Date.parse(val)), {
          message:
            "Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T14:00:00Z)",
        })
        .optional()
        .nullable(),
      coverImage: z.string().optional(),
      // Audio fields (these are set by controller after upload, not from body)
      audioUrl: z.string().optional(),
      audioSignedUrl: z.string().optional(),
      audioFileName: z.string().optional(),
      audioSize: z.number().optional(),
      audioFormat: z.string().optional(),
      audioDuration: z.number().optional(),
    })
    .refine(
      (data) => {
        // If status is being changed to scheduled, scheduledAt must be provided and in the future (UTC comparison)
        if (data.status === BlogStatus.SCHEDULED) {
          if (!data.scheduledAt) return false;
          return isInFuture(data.scheduledAt);
        }
        return true;
      },
      {
        message: "Scheduled blogs require a future date and time (UTC)",
        path: ["scheduledAt"],
      }
    ),
});

export const blogValidation = {
  createSchema,
  updateSchema,
};
