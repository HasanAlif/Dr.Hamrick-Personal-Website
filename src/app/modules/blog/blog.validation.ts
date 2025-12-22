import { z } from "zod";
import { BlogStatus } from "./blog.model";

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
          message: "Invalid date format. Use ISO 8601 format",
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
          message: "Invalid date format. Use ISO 8601 format",
        })
        .optional(),
      coverImage: z.string().optional(),
    })
    .refine(
      (data) => {
        // If status is scheduled, scheduledAt must be provided and in the future
        if (data.status === BlogStatus.SCHEDULED) {
          if (!data.scheduledAt) return false;
          const scheduledDate = new Date(data.scheduledAt);
          return scheduledDate > new Date();
        }
        return true;
      },
      {
        message: "Scheduled blogs require a future date and time",
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
          message: "Invalid date format. Use ISO 8601 format",
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
          message: "Invalid date format. Use ISO 8601 format",
        })
        .optional()
        .nullable(),
      coverImage: z.string().optional(),
    })
    .refine(
      (data) => {
        // If status is being changed to scheduled, scheduledAt must be provided and in the future
        if (data.status === BlogStatus.SCHEDULED) {
          if (!data.scheduledAt) return false;
          const scheduledDate = new Date(data.scheduledAt);
          return scheduledDate > new Date();
        }
        return true;
      },
      {
        message: "Scheduled blogs require a future date and time",
        path: ["scheduledAt"],
      }
    ),
});

export const blogValidation = {
  createSchema,
  updateSchema,
};
