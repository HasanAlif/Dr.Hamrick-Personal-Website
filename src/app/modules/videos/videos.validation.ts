import { z } from "zod";

const createSchema = z.object({
  body: z.object({
    title: z
      .string({
        required_error: "Video title is required",
      })
      .min(1, "Title cannot be empty")
      .max(200, "Title cannot exceed 200 characters")
      .trim()
      .refine((val) => val.length > 0, {
        message: "Title cannot be only whitespace",
      }),
    description: z
      .string()
      .max(5000, "Description cannot exceed 5000 characters")
      .trim()
      .optional()
      .default(""),
    transcription: z
      .string()
      .max(50000, "Transcription cannot exceed 50000 characters")
      .trim()
      .optional()
      .default(""),
    uploadDate: z
      .string({
        required_error: "Upload date is required",
      })
      .refine(
        (date) => {
          const parsed = Date.parse(date);
          return !isNaN(parsed);
        },
        {
          message:
            "Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T10:00:00Z)",
        }
      )
      .refine(
        (date) => {
          const parsed = new Date(date);
          const now = new Date();
          const oneYearAgo = new Date(
            now.getFullYear() - 1,
            now.getMonth(),
            now.getDate()
          );
          const oneYearFuture = new Date(
            now.getFullYear() + 1,
            now.getMonth(),
            now.getDate()
          );
          return parsed >= oneYearAgo && parsed <= oneYearFuture;
        },
        {
          message: "Upload date must be within one year from today",
        }
      ),
    status: z
      .string()
      .optional()
      .default("published")
      .refine(
        (val) => val === "published" || val === "unpublished",
        "Status must be either 'published' or 'unpublished'"
      ),
    duration: z
      .string()
      .optional()
      .transform((val) => (val && val !== "" ? parseFloat(val) : 0))
      .refine(
        (val) => !isNaN(val) && val >= 0 && val <= 86400,
        "Duration must be a positive number and cannot exceed 24 hours (86400 seconds)"
      ),
  }),
});

const updateSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(200, "Title cannot exceed 200 characters")
      .trim()
      .refine((val) => val.length > 0, {
        message: "Title cannot be only whitespace",
      })
      .optional(),
    description: z
      .string()
      .max(5000, "Description cannot exceed 5000 characters")
      .trim()
      .optional(),
    transcription: z
      .string()
      .max(50000, "Transcription cannot exceed 50000 characters")
      .trim()
      .optional(),
    uploadDate: z
      .string()
      .refine(
        (date) => {
          const parsed = Date.parse(date);
          return !isNaN(parsed);
        },
        {
          message: "Invalid date format. Use ISO 8601 format",
        }
      )
      .refine(
        (date) => {
          const parsed = new Date(date);
          const now = new Date();
          const oneYearAgo = new Date(
            now.getFullYear() - 1,
            now.getMonth(),
            now.getDate()
          );
          const oneYearFuture = new Date(
            now.getFullYear() + 1,
            now.getMonth(),
            now.getDate()
          );
          return parsed >= oneYearAgo && parsed <= oneYearFuture;
        },
        {
          message: "Upload date must be within one year from today",
        }
      )
      .optional(),
    status: z
      .string()
      .optional()
      .refine(
        (val) =>
          val === undefined || val === "published" || val === "unpublished",
        "Status must be either 'published' or 'unpublished'"
      ),
    duration: z
      .string()
      .optional()
      .transform((val) => (val && val !== "" ? parseFloat(val) : undefined))
      .refine(
        (val) => val === undefined || (!isNaN(val) && val >= 0 && val <= 86400),
        "Duration must be a positive number and cannot exceed 24 hours"
      ),
  }),
});

export const videosValidation = {
  createSchema,
  updateSchema,
};
