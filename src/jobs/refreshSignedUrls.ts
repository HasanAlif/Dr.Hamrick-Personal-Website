import cron from "node-cron";
import { Video } from "../app/modules/videos/videos.model";
import Podcast from "../app/modules/podcast/podcast.model";
import { Blog } from "../app/modules/blog/blog.model";
import { refreshSignedUrl } from "../helpers/googleCloudStorage";
import audioStreamService from "../app/modules/podcast/audioStreamService";

// Refresh signed URLs for all videos in the database
const refreshVideoSignedUrls = async (): Promise<void> => {
  try {
    console.log("🔄 Starting video signed URL refresh job...");

    const videos = await Video.find({
      isDeleted: false,
      fileName: { $exists: true, $ne: null },
    });

    let successCount = 0;
    let errorCount = 0;

    for (const video of videos) {
      try {
        const freshSignedUrl = await refreshSignedUrl(video.fileName);
        video.signedUrl = freshSignedUrl;
        await video.save();
        successCount++;
      } catch (error: any) {
        console.error(
          `Failed to refresh signed URL for video ${video._id}:`,
          error.message
        );
        errorCount++;
      }
    }

    console.log(
      `✅ Video signed URL refresh completed: ${successCount} successful, ${errorCount} failed`
    );
  } catch (error: any) {
    console.error("❌ Error in video signed URL refresh job:", error.message);
  }
};

// Refresh signed URLs for all podcast recordings in the database
const refreshPodcastSignedUrls = async (): Promise<void> => {
  try {
    console.log("🔄 Starting podcast signed URL refresh job...");

    const podcasts = await Podcast.find({
      recordedFileName: { $exists: true, $ne: null },
    });

    let successCount = 0;
    let errorCount = 0;

    for (const podcast of podcasts) {
      try {
        const freshSignedUrl = await audioStreamService.refreshPodcastSignedUrl(
          podcast.recordedFileName!
        );
        podcast.recordedSignedUrl = freshSignedUrl;
        await podcast.save();
        successCount++;
      } catch (error: any) {
        console.error(
          `Failed to refresh signed URL for podcast ${podcast._id}:`,
          error.message
        );
        errorCount++;
      }
    }

    console.log(
      `✅ Podcast signed URL refresh completed: ${successCount} successful, ${errorCount} failed`
    );
  } catch (error: any) {
    console.error("❌ Error in podcast signed URL refresh job:", error.message);
  }
};

// Refresh signed URLs for all blog audio files in the database
const refreshBlogAudioSignedUrls = async (): Promise<void> => {
  try {
    console.log("🔄 Starting blog audio signed URL refresh job...");

    const blogs = await Blog.find({
      audioFileName: { $exists: true, $ne: null },
    });

    let successCount = 0;
    let errorCount = 0;

    for (const blog of blogs) {
      try {
        const freshSignedUrl = await refreshSignedUrl(blog.audioFileName!);
        blog.audioSignedUrl = freshSignedUrl;
        await blog.save();
        successCount++;
      } catch (error: any) {
        console.error(
          `Failed to refresh signed URL for blog ${blog._id}:`,
          error.message
        );
        errorCount++;
      }
    }

    console.log(
      `✅ Blog audio signed URL refresh completed: ${successCount} successful, ${errorCount} failed`
    );
  } catch (error: any) {
    console.error(
      "❌ Error in blog audio signed URL refresh job:",
      error.message
    );
  }
};

// Refresh all signed URLs (videos + podcasts + blogs)
const refreshAllSignedUrls = async (): Promise<void> => {
  console.log("📅 Running scheduled signed URL refresh job...");
  const startTime = Date.now();

  await Promise.all([
    refreshVideoSignedUrls(),
    refreshPodcastSignedUrls(),
    refreshBlogAudioSignedUrls(),
  ]);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`⏱️  Signed URL refresh job completed in ${duration}s`);
};

// Schedule the cron job to run every 6 days at 2 AM UTC
export const startSignedUrlRefreshJob = (): void => {
  cron.schedule(
    "0 2 */6 * *",
    async () => {
      await refreshAllSignedUrls();
    },
    { timezone: "UTC" }
  );

  console.log(
    "✅ Signed URL refresh job scheduled (runs every 6 days at 2 AM UTC)"
  );

  // Optional: Run immediately on startup for testing
  // Uncomment the line below if you want to refresh URLs on server start
  // refreshAllSignedUrls();
};

// Export individual functions for manual execution if needed
export {
  refreshVideoSignedUrls,
  refreshPodcastSignedUrls,
  refreshBlogAudioSignedUrls,
  refreshAllSignedUrls,
};
