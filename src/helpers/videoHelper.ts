import { getVideoDurationInSeconds } from "get-video-duration";
import { Readable } from "stream";

/**
 * Extract video duration from buffer
 * Note: For large files (>100MB), this operation is skipped to save memory
 * Duration will be set to 0 and can be updated later
 */
export const getVideoDuration = async (buffer: Buffer, fileSize: number): Promise<number> => {
  try {
    // Skip duration extraction for very large files (>500MB) to save memory
    // This prevents memory exhaustion during upload
    if (fileSize > 500 * 1024 * 1024) {
      console.log(`⏭️ Skipping duration extraction for large file (${(fileSize / (1024 * 1024)).toFixed(2)}MB)`);
      return 0;
    }

    // Convert buffer to readable stream
    const stream = Readable.from(buffer);

    // Get duration using the library with timeout
    const durationPromise = getVideoDurationInSeconds(stream);
    const timeoutPromise = new Promise<number>((_, reject) => 
      setTimeout(() => reject(new Error('Duration extraction timeout')), 30000)
    );

    const duration = await Promise.race([durationPromise, timeoutPromise]);

    return Math.round(duration); // Round to nearest second
  } catch (error) {
    console.error("Error extracting video duration:", error);
    return 0; // Return 0 if extraction fails - can be updated later
  }
};

export const getVideoDurationFromUrl = async (url: string): Promise<number> => {
  try {
    const duration = await getVideoDurationInSeconds(url);
    return Math.round(duration);
  } catch (error) {
    console.error("Error extracting video duration from URL:", error);
    return 0;
  }
};
