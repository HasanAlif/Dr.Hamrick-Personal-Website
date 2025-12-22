import { getVideoDurationInSeconds } from "get-video-duration";
import { Readable } from "stream";

export const getVideoDuration = async (buffer: Buffer): Promise<number> => {
  try {
    // Convert buffer to readable stream
    const stream = Readable.from(buffer);

    // Get duration using the library
    const duration = await getVideoDurationInSeconds(stream);

    return Math.round(duration); // Round to nearest second
  } catch (error) {
    console.error("Error extracting video duration:", error);
    return 0;
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
