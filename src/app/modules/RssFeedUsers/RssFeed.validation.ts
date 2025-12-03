import { z } from "zod";

const createSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Name is required",
      })
      .min(1, "Name cannot be empty")
      .trim(),
    email: z
      .string({
        required_error: "Email is required",
      })
      .email("Invalid email format")
      .trim(),
    phone: z.string().optional(),
  }),
});

export const rssFeedValidation = {
  createSchema,
};
