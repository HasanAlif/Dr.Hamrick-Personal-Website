import { WebsiteContent, ContentType } from './websiteContent.model';
import ApiError from '../../../errors/ApiErrors';
import httpStatus from 'http-status';

// Update content by type (upsert: create if not exists, update if exists)
const updateContentByType = async (type: ContentType, content: string) => {
  const result = await WebsiteContent.findOneAndUpdate(
    { type },
    { content },
    { new: true, upsert: true, runValidators: true }
  );
  return result;
};

// Get content by type (public endpoint)
const getContentByType = async (type: ContentType) => {
  const result = await WebsiteContent.findOne({ type });
  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `${type === ContentType.ABOUT_US ? 'About Us' : 'Privacy Policy'} not found`
    );
  }
  return result;
};

export const websiteContentService = {
  updateContentByType,
  getContentByType,
};