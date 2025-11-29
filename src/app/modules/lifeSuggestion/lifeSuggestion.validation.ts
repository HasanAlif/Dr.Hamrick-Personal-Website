import { z } from "zod";

const createLifeSuggestion = z.object({
  body: z.object({
    type: z.enum(["increase", "decrease"], {
      required_error: "Type is required (increase or decrease)",
    }),
    content: z
      .string({
        required_error: "Content is required",
      })
      .min(1, "Content cannot be empty")
      .trim(),
  }),
});

const updateLifeSuggestion = z.object({
  body: z.object({
    content: z
      .string({
        required_error: "Content is required",
      })
      .min(1, "Content cannot be empty")
      .trim(),
  }),
});

export const lifeSuggestionValidation = {
  createLifeSuggestion,
  updateLifeSuggestion,
};
