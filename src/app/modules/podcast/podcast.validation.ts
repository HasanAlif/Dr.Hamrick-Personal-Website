import { z } from "zod";

const createPodcastSchema = z.object({
  body: z.object({
    title: z
      .string({
        required_error: "Title is required",
      })
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title cannot exceed 200 characters"),
  }),
});

const updatePodcastSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title cannot exceed 200 characters")
      .optional(),
    description: z
      .string()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional(),
    transcription: z.string().optional(),
    date: z.string().optional(),
    status: z
      .enum(["scheduled", "live", "published", "unpublished", "cancelled"])
      .optional(),
  }),
});

export const podcastValidation = {
  createSchema: createPodcastSchema,
  updateSchema: updatePodcastSchema,
};
