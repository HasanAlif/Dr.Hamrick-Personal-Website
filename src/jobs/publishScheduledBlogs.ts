import cron from "node-cron";
import { Blog, BlogStatus } from "../app/modules/blog/blog.model";

// Publish all scheduled blogs whose scheduledAt time has passed
// This job runs every hour and checks for blogs that need to be published
const publishScheduledBlogs = async (): Promise<void> => {
  try {
    const now = new Date();

    // Find all scheduled blogs where scheduledAt <= current time
    const blogsToPublish = await Blog.find({
      status: BlogStatus.SCHEDULED,
      scheduledAt: { $lte: now },
    });

    if (blogsToPublish.length === 0) {
      return; // No blogs to publish, exit silently
    }

    console.log(
      `Found ${blogsToPublish.length} scheduled blog(s) to publish`
    );

    let successCount = 0;
    let errorCount = 0;

    // Update each blog to published status
    for (const blog of blogsToPublish) {
      try {
        await Blog.findByIdAndUpdate(blog._id, {
          status: BlogStatus.PUBLISHED,
          scheduledAt: null,
          updatedAt: new Date(),
        });
        successCount++;
        console.log(`Published blog: "${blog.title}" (ID: ${blog._id})`);
      } catch (error: any) {
        console.error(`Failed to publish blog ${blog._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(
      `Scheduled blog publish completed: ${successCount} published, ${errorCount} failed`
    );
  } catch (error: any) {
    console.error("Error in scheduled blog publish job:", error.message);
  }
};

// Start the CRON job for publishing scheduled blogs
export const startScheduledBlogPublisher = (): void => {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    await publishScheduledBlogs();
  });

  console.log("✅ Scheduled blog publisher job started (runs every hour)");
};

// Export for manual execution or testing
export { publishScheduledBlogs };
