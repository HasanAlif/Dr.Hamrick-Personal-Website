import { z } from "zod";
import { ContentType } from "./websiteContent.model";

const updateSchema = z.object({
  body: z.object({
    content: z
      .string({
        required_error: "Content is required",
      })
      .min(1, "Content cannot be empty")
      .trim(),
  }),
  params: z.object({
    type: z.enum(
      [
        ContentType.ABOUT_US,
        ContentType.PRIVACY_POLICY,
        ContentType.MOTIVATION,
        ContentType.BLOG_MOTIVATION,
        ContentType.PUBLICATION_MOTIVATION,
        ContentType.VIDEO_MOTIVATION,
        ContentType.PODCAST_MOTIVATION,
        ContentType.DISCLAIMER,
        ContentType.FOOTTER_TEXT_1,
        ContentType.FOOTTER_TEXT_2,
        ContentType.CONTACT_TEXT,
      ],
      {
        required_error: "Content type is required",
        invalid_type_error: "Invalid content type",
      }
    ),
  }),
});

export const websiteContentValidation = {
  updateSchema,
};
