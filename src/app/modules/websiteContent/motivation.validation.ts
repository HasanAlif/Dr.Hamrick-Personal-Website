import { z } from "zod";

const createSchema = z.object({
  body: z.object({
    text: z
      .string({
        required_error: "Motivation text is required",
      })
      .min(1, "Motivation text cannot be empty")
      .trim(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    text: z
      .string()
      .min(1, "Motivation text cannot be empty")
      .trim()
      .optional(),
  }),
});

export const motivationValidation = {
  createSchema,
  updateSchema,
};
