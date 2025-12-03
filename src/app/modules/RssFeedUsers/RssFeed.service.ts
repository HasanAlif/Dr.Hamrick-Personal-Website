import ApiError from "../../../errors/ApiErrors";
import { RssFeed } from "./RssFeed.model";
import httpStatus from "http-status";

const storeUserData = async (data: {
  name: string;
  email: string;
  phone?: string;
}) => {
  const isExisting = await RssFeed.findOne({ email: data.email });
  if (isExisting) {
    throw new ApiError(httpStatus.CONFLICT, "Your Data is Already Stored");
  }
  const rssFeed = await RssFeed.create(data);
  return rssFeed;
};

const getListFromDb = async () => {
  const rssFeeds = await RssFeed.find();
  return rssFeeds;
};

export const rssFeedService = {
  storeUserData,
  getListFromDb,
};
