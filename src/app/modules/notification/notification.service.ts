import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import emailSender from "../../../shared/emailSender";
import { NOTIFICATION_EMAIL_TEMPLATE } from "../../../utils/Template";
import { Blog, BlogStatus } from "../blog/blog.model";
import {
  Publications,
  PublicationStatus,
} from "../publications/publications.model";
import { Video, VideoStatus } from "../videos/videos.model";
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

const getLatestContentUrl = async (): Promise<string> => {
  const baseUrl = "https://www.pg-65.com";

  try {
    // Query latest from each content type in parallel
    const [latestBlog, latestVideo, latestPublication, latestPodcast] =
      await Promise.all([
        Blog.findOne({ status: BlogStatus.PUBLISHED })
          .select("_id uploadDate")
          .sort({ uploadDate: -1, createdAt: -1 })
          .lean(),
        Video.findOne({ status: VideoStatus.PUBLISHED, isDeleted: false })
          .select("_id uploadDate")
          .sort({ uploadDate: -1, createdAt: -1 })
          .lean(),
        Publications.findOne({ status: PublicationStatus.PUBLISHED })
          .select("_id createdAt")
          .sort({ createdAt: -1 })
          .lean(),
        Podcast.findOne({ status: PodcastStatus.PUBLISHED })
          .select("_id actualStart")
          .sort({ actualStart: -1, createdAt: -1 })
          .lean(),
      ]);

    // Build array of content with primary date field
    const contentWithDates = [
      { type: "blog", id: latestBlog?._id, date: latestBlog?.uploadDate },
      { type: "videos", id: latestVideo?._id, date: latestVideo?.uploadDate },
      {
        type: "publications",
        id: latestPublication?._id,
        date: latestPublication?.createdAt,
      },
      {
        type: "podcasts",
        id: latestPodcast?._id,
        date: latestPodcast?.actualStart,
      },
    ];

    // Filter out items without valid dates
    const validContent = contentWithDates.filter((item) => {
      if (!item.date) return false;
      const dateTime = new Date(item.date).getTime();
      return dateTime > 0;
    });

    // If no valid content, return homepage
    if (validContent.length === 0) {
      console.log(
        "[Latest Content] No publishable content found, using homepage",
      );
      return baseUrl;
    }

    // Find the most recent content by direct date comparison
    const latest = validContent.reduce((prev, current) => {
      const currentTime = new Date(current.date!).getTime();
      const prevTime = new Date(prev.date!).getTime();
      return currentTime > prevTime ? current : prev;
    });

    console.log(
      `[Latest Content] Selected: ${latest.type} (id: ${latest.id}) at ${new Date(latest.date!).toISOString()}`,
    );

    return `${baseUrl}/${latest.type}/${latest.id}`;
  } catch (error) {
    // On any error, safely fall back to homepage
    console.error("Error fetching latest content URL:", error);
    return baseUrl;
  }
};

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
    Blog.find({ isNotified: false, status: BlogStatus.PUBLISHED }).lean(),
    Publications.find({
      isNotified: false,
      status: PublicationStatus.PUBLISHED,
    }).lean(),
    Video.find({
      isNotified: false,
      status: VideoStatus.PUBLISHED,
      isDeleted: false,
    }).lean(),
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
      "No new content to notify subscribers about",
    );
  }

  // Step 5: Mark all content as notified BEFORE sending emails (prevents duplicate notifications on retry)
  const markAsNotifiedPromises = [];

  if (counts.blogs > 0) {
    markAsNotifiedPromises.push(
      Blog.updateMany(
        { isNotified: false, status: BlogStatus.PUBLISHED },
        { $set: { isNotified: true } },
      ),
    );
  }

  if (counts.publications > 0) {
    markAsNotifiedPromises.push(
      Publications.updateMany(
        { isNotified: false, status: PublicationStatus.PUBLISHED },
        { $set: { isNotified: true } },
      ),
    );
  }

  if (counts.videos > 0) {
    markAsNotifiedPromises.push(
      Video.updateMany(
        {
          isNotified: false,
          status: VideoStatus.PUBLISHED,
          isDeleted: false,
        },
        { $set: { isNotified: true } },
      ),
    );
  }

  if (counts.podcasts > 0) {
    markAsNotifiedPromises.push(
      Podcast.updateMany({ isNotified: false }, { $set: { isNotified: true } }),
    );
  }

  if (counts.lifeSuggestions > 0) {
    markAsNotifiedPromises.push(
      LifeSuggestion.updateMany(
        { isNotified: false },
        { $set: { isNotified: true } },
      ),
    );
  }

  // Execute all updates in parallel
  await Promise.all(markAsNotifiedPromises);

  // Step 6: Get the latest content URL dynamically
  const websiteUrl = await getLatestContentUrl();

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

        const result = await emailSender(
          subscriber.email,
          emailHtml,
          livePodcastCount > 0
            ? "🔴 Dr. Irene Hamrick is Live Now!"
            : "New Content from Dr. Irene Hamrick",
        );

        return {
          success: result.success,
          email: subscriber.email,
          messageId: result.messageId,
        };
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
