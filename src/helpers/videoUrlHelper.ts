import https from "https";
import http from "http";
import { URL } from "url";

export const isValidVideoUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    // Check if protocol is http or https
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch (error) {
    return false;
  }
};

export const fetchVideoUrlMetadata = async (
  url: string
): Promise<{
  contentType: string;
  contentLength: number;
  isAccessible: boolean;
}> => {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === "https:" ? https : http;

      const request = client.request(
        url,
        {
          method: "HEAD", // Only fetch headers, not content
          timeout: 10000, // 10 second timeout
        },
        (response) => {
          const contentType = response.headers["content-type"] || "video/mp4";
          const contentLength = parseInt(
            response.headers["content-length"] || "0",
            10
          );

          resolve({
            contentType,
            contentLength,
            isAccessible: response.statusCode === 200,
          });
        }
      );

      request.on("error", (error) => {
        console.error("Error fetching video URL metadata:", error);
        // Return default values if URL is not accessible
        resolve({
          contentType: "video/mp4",
          contentLength: 0,
          isAccessible: false,
        });
      });

      request.on("timeout", () => {
        request.destroy();
        resolve({
          contentType: "video/mp4",
          contentLength: 0,
          isAccessible: false,
        });
      });

      request.end();
    } catch (error) {
      console.error("Error parsing video URL:", error);
      resolve({
        contentType: "video/mp4",
        contentLength: 0,
        isAccessible: false,
      });
    }
  });
};

//Generates a unique fileName for external video URLs This ensures consistency in the database
export const generateFileNameFromUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const filename = pathname.split("/").pop() || "external-video";
    const timestamp = Date.now();
    return `external-videos/${timestamp}_${filename}`;
  } catch (error) {
    const timestamp = Date.now();
    return `external-videos/${timestamp}_video`;
  }
};

// Helper to determine if a video is from an external URL (not uploaded to GCS)
export const isExternalVideo = (fileName: string): boolean => {
  return fileName.startsWith("external-videos/");
};
