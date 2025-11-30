import { Storage } from "@google-cloud/storage";
import config from "../../../config";
import path from "path";
import fs from "fs";
import { Readable } from "stream";

// Signed URL configuration
const SIGNED_URL_EXPIRATION_DAYS = 7;
const SIGNED_URL_VERSION = "v4" as const;

// Initialize Google Cloud Storage with flexible authentication
// Priority: 1. Environment variables (for production) 2. Key file (for local dev)
const initializeStorage = (): Storage => {
  const projectId = config.gcs.projectId;

  // Check if we have environment variable credentials (production)
  if (config.gcs.clientEmail && config.gcs.privateKey) {
    return new Storage({
      projectId,
      credentials: {
        client_email: config.gcs.clientEmail,
        private_key: config.gcs.privateKey,
      },
    });
  }

  // Check if key file exists (local development)
  const keyFilePath = path.join(process.cwd(), config.gcs.keyFile || "");
  if (config.gcs.keyFile && fs.existsSync(keyFilePath)) {
    return new Storage({
      projectId,
      keyFilename: keyFilePath,
    });
  }

  // Fallback: Try default credentials (GCE, Cloud Run, etc.)
  return new Storage({ projectId });
};

const storage = initializeStorage();
const bucket = storage.bucket(config.gcs.bucketName || "");

interface AudioRecording {
  chunks: Buffer[];
  startTime: number;
  format: string;
}

class AudioStreamService {
  private activeRecordings: Map<string, AudioRecording> = new Map();

  // Start recording audio for a podcast session
  startRecording(sessionId: string, format: string = "webm"): void {
    this.activeRecordings.set(sessionId, {
      chunks: [],
      startTime: Date.now(),
      format,
    });
    console.log(`Started recording for session: ${sessionId}`);
  }

  // Append audio chunk to recording buffer
  appendAudioChunk(sessionId: string, chunk: Buffer): boolean {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) {
      console.warn(`No active recording found for session: ${sessionId}`);
      return false;
    }
    recording.chunks.push(chunk);
    return true;
  }

  // Stop recording and upload to Google Cloud Storage
  async stopRecordingAndUpload(
    sessionId: string,
    podcastId: string,
    podcastTitle: string
  ): Promise<{
    publicUrl: string;
    signedUrl: string;
    fileName: string;
    fileSize: number;
    duration: number;
  }> {
    const recording = this.activeRecordings.get(sessionId);

    if (!recording || recording.chunks.length === 0) {
      throw new Error("No recording data found for this session");
    }

    try {
      // Combine all chunks into single buffer
      const audioBuffer = Buffer.concat(recording.chunks);
      const fileSize = audioBuffer.length;
      const duration = Math.round((Date.now() - recording.startTime) / 60000); // minutes

      // Generate filename
      const timestamp = Date.now();
      const sanitizedTitle = podcastTitle
        .replace(/[^a-zA-Z0-9]/g, "_")
        .substring(0, 50);
      const fileName = `podcasts/${podcastId}_${timestamp}_${sanitizedTitle}.${recording.format}`;

      // Upload to GCS
      const file = bucket.file(fileName);

      // Convert buffer to readable stream
      const bufferStream = new Readable();
      bufferStream.push(audioBuffer);
      bufferStream.push(null);

      // Upload with retry logic
      await new Promise<void>((resolve, reject) => {
        const writeStream = file.createWriteStream({
          metadata: {
            contentType: this.getContentType(recording.format),
            metadata: {
              podcastId,
              uploadedAt: new Date().toISOString(),
              duration: duration.toString(),
              originalTitle: podcastTitle,
            },
          },
          resumable: fileSize > 10 * 1024 * 1024, // Use resumable for files > 10MB
          timeout: 10 * 60 * 1000, // 10 minutes timeout
        });

        bufferStream
          .pipe(writeStream)
          .on("error", (error) => {
            console.error("GCS upload error:", error);
            reject(error);
          })
          .on("finish", () => {
            console.log(`Successfully uploaded: ${fileName}`);
            resolve();
          });
      });

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      // Generate signed URL for secure access
      const [signedUrl] = await file.getSignedUrl({
        version: SIGNED_URL_VERSION,
        action: "read",
        expires: Date.now() + SIGNED_URL_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
      });

      // Cleanup recording from memory
      this.activeRecordings.delete(sessionId);

      return {
        publicUrl,
        signedUrl,
        fileName,
        fileSize,
        duration,
      };
    } catch (error) {
      console.error("Error uploading audio to GCS:", error);
      // Cleanup on error
      this.activeRecordings.delete(sessionId);
      throw new Error("Failed to upload audio recording to cloud storage");
    }
  }

  // Cancel recording without saving
  cancelRecording(sessionId: string): void {
    const recording = this.activeRecordings.get(sessionId);
    if (recording) {
      this.activeRecordings.delete(sessionId);
      console.log(`Cancelled recording for session: ${sessionId}`);
    }
  }

  // Get recording status
  getRecordingStatus(sessionId: string): {
    isRecording: boolean;
    chunksCount: number;
    estimatedSize: number;
  } | null {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) {
      return null;
    }

    const estimatedSize = recording.chunks.reduce(
      (total, chunk) => total + chunk.length,
      0
    );

    return {
      isRecording: true,
      chunksCount: recording.chunks.length,
      estimatedSize,
    };
  }

  // Refresh signed URL for an existing podcast recording
  async refreshPodcastSignedUrl(fileName: string): Promise<string> {
    try {
      const file = bucket.file(fileName);
      const [exists] = await file.exists();

      if (!exists) {
        throw new Error(`Podcast recording not found: ${fileName}`);
      }

      const [signedUrl] = await file.getSignedUrl({
        version: SIGNED_URL_VERSION,
        action: "read",
        expires: Date.now() + SIGNED_URL_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
      });

      return signedUrl;
    } catch (error) {
      console.error("Error refreshing podcast signed URL:", error);
      throw error;
    }
  }

  // Get content type based on format
  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      webm: "audio/webm",
      mp3: "audio/mpeg",
      ogg: "audio/ogg",
    };
    return contentTypes[format] || "audio/webm";
  }

  // Cleanup all active recordings (use on server shutdown)
  cleanupAllRecordings(): void {
    console.log(`Cleaning up ${this.activeRecordings.size} active recordings`);
    this.activeRecordings.clear();
  }
}

export default new AudioStreamService();
