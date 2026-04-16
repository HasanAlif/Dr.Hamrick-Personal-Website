import { z } from "zod";
import { PublicationStatus } from "./publications.model";

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
      .enum([
        PublicationStatus.PUBLISHED,
        PublicationStatus.UNPUBLISHED,
        PublicationStatus.SCHEDULED,
      ])
      .optional(),
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
      .enum([
        PublicationStatus.PUBLISHED,
        PublicationStatus.UNPUBLISHED,
        PublicationStatus.SCHEDULED,
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
