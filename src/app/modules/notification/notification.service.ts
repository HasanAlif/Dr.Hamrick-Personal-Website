import mongoose from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import emailSender from "../../../shared/emailSender";
import { NOTIFICATION_EMAIL_TEMPLATE } from "../../../utils/Template";
import config from "../../../config";
import { Blog } from "../blog/blog.model";
import { Publications } from "../publications/publications.model";
import { Video } from "../videos/videos.model";
import Podcast, { PodcastStatus } from "../podcast/podcast.model";
import { LifeSuggestion } from "../lifeSuggestion/lifeSuggestion.model";
import { RssFeed } from "../RssFeedUsers/RssFeed.model";

interface IContentCounts {
  blogs: number;
  publications: number;
  videos: number;
  podcasts: number;
  lifeSuggestions: number;
}

interface INotificationResult {
  subscribersNotified: number;
  contentCounts: IContentCounts;
  livePodcasts: number;
  emailsSent: number;
  emailsFailed: number;
}

const sendToSubscribers = async (): Promise<INotificationResult> => {
  // Step 1: Get all RSS Feed subscribers first (outside transaction)
  const subscribers = await RssFeed.find({}).lean();

  if (!subscribers || subscribers.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "No RSS Feed subscribers found");
  }

  // Step 2: Query all unnotified content (filter by status/isDeleted where applicable)
  const [
    unnotifiedBlogs,
    unnotifiedPublications,
    unnotifiedVideos,
    unnotifiedPodcasts,
    unnotifiedLifeSuggestions,
    livePodcasts,
  ] = await Promise.all([
    Blog.find({ isNotified: false, status: true }).lean(),
    Publications.find({ isNotified: false, status: true }).lean(),
    Video.find({ isNotified: false, status: true, isDeleted: false }).lean(),
    Podcast.find({ isNotified: false }).lean(),
    LifeSuggestion.find({ isNotified: false }).lean(),
    Podcast.find({ status: PodcastStatus.LIVE }).lean(),
  ]);

  // Step 3: Count unnotified items
  const counts: IContentCounts = {
    blogs: unnotifiedBlogs.length,
    publications: unnotifiedPublications.length,
    videos: unnotifiedVideos.length,
    podcasts: unnotifiedPodcasts.length,
    lifeSuggestions: unnotifiedLifeSuggestions.length,
  };

  const livePodcastCount = livePodcasts.length;

  // Step 4: Check if there's anything to notify
  const totalNewContent =
    counts.blogs +
    counts.publications +
    counts.videos +
    counts.podcasts +
    counts.lifeSuggestions;

  if (totalNewContent === 0 && livePodcastCount === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No new content to notify subscribers about"
    );
  }

  // Step 5: Mark all content as notified BEFORE sending emails (prevents duplicate notifications on retry)
  const markAsNotifiedPromises = [];

  if (counts.blogs > 0) {
    markAsNotifiedPromises.push(
      Blog.updateMany(
        { isNotified: false, status: true },
        { $set: { isNotified: true } }
      )
    );
  }

  if (counts.publications > 0) {
    markAsNotifiedPromises.push(
      Publications.updateMany(
        { isNotified: false, status: true },
        { $set: { isNotified: true } }
      )
    );
  }

  if (counts.videos > 0) {
    markAsNotifiedPromises.push(
      Video.updateMany(
        { isNotified: false, status: true, isDeleted: false },
        { $set: { isNotified: true } }
      )
    );
  }

  if (counts.podcasts > 0) {
    markAsNotifiedPromises.push(
      Podcast.updateMany({ isNotified: false }, { $set: { isNotified: true } })
    );
  }

  if (counts.lifeSuggestions > 0) {
    markAsNotifiedPromises.push(
      LifeSuggestion.updateMany(
        { isNotified: false },
        { $set: { isNotified: true } }
      )
    );
  }

  // Execute all updates in parallel
  await Promise.all(markAsNotifiedPromises);

  // Step 6: Send emails to all subscribers
  const websiteUrl = config.site_url || "https://ihamrick-frontend.vercel.app/";

  let emailsSent = 0;
  let emailsFailed = 0;

  // Send emails in batches to avoid overwhelming the SMTP server
  const batchSize = 50;
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const emailPromises = batch.map(async (subscriber) => {
      try {
        const emailHtml = NOTIFICATION_EMAIL_TEMPLATE({
          subscriberName: subscriber.name,
          counts,
          livePodcasts: livePodcastCount,
          websiteUrl,
        });

        await emailSender(
          subscriber.email,
          emailHtml,
          livePodcastCount > 0
            ? "🔴 Dr. Irene Hamrick is Live Now!"
            : "New Content from Dr. Irene Hamrick"
        );

        return { success: true, email: subscriber.email };
      } catch (error) {
        console.error(`Failed to send email to ${subscriber.email}:`, error);
        return { success: false, email: subscriber.email };
      }
    });

    const results = await Promise.allSettled(emailPromises);

    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.success) {
        emailsSent++;
      } else {
        emailsFailed++;
      }
    });

    // Small delay between batches to respect rate limits
    if (i + batchSize < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return {
    subscribersNotified: subscribers.length,
    contentCounts: counts,
    livePodcasts: livePodcastCount,
    emailsSent,
    emailsFailed,
  };
};

export const notificationService = {
  sendToSubscribers,
};
