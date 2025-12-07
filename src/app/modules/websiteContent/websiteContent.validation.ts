import { z } from "zod";

const updateSchema = z.object({
  body: z.object({
    content: z
      .string({
        required_error: "Content is required",
      })
      .min(1, "Content cannot be empty")
      .trim(),
  }),
});

export const websiteContentValidation = {
  updateSchema,
};
