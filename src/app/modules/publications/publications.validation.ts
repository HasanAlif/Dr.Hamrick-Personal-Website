import { z } from "zod";

// Helper for parsing string values from form data
const parseBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return Boolean(value);
};

const createSchema = z.object({
  body: z.object({
    title: z
      .string({
        required_error: "Title is required",
      })
      .min(1, "Title cannot be empty"),
    author: z.string().min(1, "Author name cannot be empty"),
    publicationDate: z.string().optional(),
    fileType: z.enum(["pdf", "pptx", "docx", "txt"]).optional(),
    status: z
      .union([
        z.boolean(),
        z.string().transform(parseBoolean),
        z.any().transform((val) => parseBoolean(val)),
      ])
      .optional()
      .default(true),
    description: z.string().min(1, "Description cannot be empty"),
    coverImage: z.string().optional(),
    file: z.string().optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title cannot be empty").optional(),
    author: z.string().min(1, "Author name cannot be empty").optional(),
    publicationDate: z.string().optional(),
    fileType: z.enum(["pdf", "pptx", "docx", "txt"]).optional(),
    status: z
      .union([
        z.boolean(),
        z.string().transform(parseBoolean),
        z.any().transform((val) => parseBoolean(val)),
      ])
      .optional(),
    description: z.string().min(1, "Description cannot be empty").optional(),
    coverImage: z.string().optional(),
    file: z.string().optional(),
  }),
});

export const publicationsValidation = {
  createSchema,
  updateSchema,
};
