import { Storage } from "@google-cloud/storage";
import config from "../config";
import path from "path";
import fs from "fs";
import ApiError from "../errors/ApiErrors";

// Initialize Google Cloud Storage with flexible authentication
// Priority: 1. Environment variables (for production) 2. Key file (for local dev)
const initializeStorage = (): Storage => {
  const projectId = config.gcs.projectId;

  // Check if we have environment variable credentials (production)
  if (config.gcs.clientEmail && config.gcs.privateKey) {
    console.log("Using GCS credentials from environment variables");
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
    console.log("Using GCS credentials from key file");
    return new Storage({
      projectId,
      keyFilename: keyFilePath,
    });
  }

  // Fallback: Try default credentials (GCE, Cloud Run, etc.)
  console.log("Using GCS default credentials");
  return new Storage({ projectId });
};

const storage = initializeStorage();
const bucket = storage.bucket(config.gcs.bucketName || "");

// Constants for signed URL configuration
const SIGNED_URL_EXPIRATION_DAYS = 7;
const SIGNED_URL_VERSION = "v4" as const;

interface UploadResult {
  publicUrl: string;
  signedUrl: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

// Upload file to Google Cloud Storage with resumable upload for large files
// Supports files up to 5GB with automatic retry logic
export const uploadToGCS = async (
  file: Express.Multer.File,
  folder: string
): Promise<UploadResult> => {
  try {
    if (!file || !file.buffer) {
      throw new Error("No file provided");
    }

    // Validate file size
    if (file.size === 0) {
      throw new Error("File is empty");
    }

    if (file.size > config.upload.maxVideoSize) {
      throw new Error(
        `File size (${(file.size / (1024 * 1024 * 1024)).toFixed(
          2
        )}GB) exceeds maximum limit of ${(
          config.upload.maxVideoSize /
          (1024 * 1024 * 1024)
        ).toFixed(2)}GB`
      );
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${folder}/${timestamp}_${sanitizedFileName}`;
    const blob = bucket.file(fileName);

    // Use resumable upload for files larger than 10MB for reliability
    const useResumable = file.size > 10 * 1024 * 1024;

    const blobStream = blob.createWriteStream({
      resumable: useResumable,
      metadata: {
        contentType: file.mimetype,
        metadata: {
          uploadedAt: new Date().toISOString(),
          originalName: file.originalname,
          fileSize: file.size.toString(),
        },
      },
      // Timeout for large uploads (30 minutes)
      timeout: 30 * 60 * 1000,
    });

    return new Promise((resolve, reject) => {
      let uploadTimeout: NodeJS.Timeout;

      // Set overall timeout for the upload (45 minutes for 5GB files)
      uploadTimeout = setTimeout(() => {
        blobStream.destroy();
        reject(new Error("Upload timeout: File upload took too long"));
      }, 45 * 60 * 1000);

      blobStream.on("error", (err: any) => {
        clearTimeout(uploadTimeout);
        console.error("GCS Upload Error:", {
          error: err.message,
          code: err.code,
          fileName: file.originalname,
          fileSize: file.size,
        });

        // Provide specific error messages
        if (err.code === "ECONNRESET" || err.code === "ETIMEDOUT") {
          reject(
            new Error(
              "Network connection lost during upload. Please try again."
            )
          );
        } else if (err.code === 403) {
          reject(
            new Error("Permission denied. Check service account permissions.")
          );
        } else if (err.code === 413) {
          reject(new Error("File size exceeds server upload limit."));
        } else {
          reject(new Error(`Upload failed: ${err.message}`));
        }
      });

      blobStream.on("finish", async () => {
        clearTimeout(uploadTimeout);

        try {
          // Generate signed URL for secure access
          const signedUrl = await generateSignedUrl(fileName);
          const publicUrl = `https://storage.googleapis.com/${config.gcs.bucketName}/${fileName}`;

          console.log(
            `✅ File uploaded successfully: ${fileName} (${(
              file.size /
              (1024 * 1024)
            ).toFixed(2)}MB)`
          );

          resolve({
            publicUrl,
            signedUrl,
            fileName,
            fileSize: file.size,
            contentType: file.mimetype,
          });
        } catch (signedUrlError: any) {
          console.error("Error generating signed URL:", signedUrlError);
          // Fallback to public URL if signed URL generation fails
          const publicUrl = `https://storage.googleapis.com/${config.gcs.bucketName}/${fileName}`;
          resolve({
            publicUrl,
            signedUrl: publicUrl,
            fileName,
            fileSize: file.size,
            contentType: file.mimetype,
          });
        }
      });

      // Write the file buffer
      blobStream.end(file.buffer);
    });
  } catch (error: any) {
    console.error("Error uploading to GCS:", {
      error: error.message,
      fileName: file?.originalname,
      fileSize: file?.size,
    });
    throw error;
  }
};

/**
 * Generate a signed URL for secure file access
 * @param fileName - Name of the file in GCS bucket
 * @param expiresInDays - Number of days until URL expires (default: 7)
 * @returns Signed URL string
 */
const generateSignedUrl = async (
  fileName: string,
  expiresInDays: number = SIGNED_URL_EXPIRATION_DAYS
): Promise<string> => {
  try {
    const options = {
      version: SIGNED_URL_VERSION,
      action: "read" as const,
      expires: Date.now() + expiresInDays * 24 * 60 * 60 * 1000, // Convert days to milliseconds
    };

    const [signedUrl] = await bucket.file(fileName).getSignedUrl(options);
    return signedUrl;
  } catch (error: any) {
    console.error("Error generating signed URL:", error);
    throw new ApiError(500, `Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Refresh signed URL for an existing file
 * @param fileName - Name of the file in GCS bucket
 * @returns New signed URL
 */
export const refreshSignedUrl = async (fileName: string): Promise<string> => {
  try {
    // Check if file exists
    const [exists] = await bucket.file(fileName).exists();
    if (!exists) {
      throw new ApiError(404, `File not found: ${fileName}`);
    }

    return await generateSignedUrl(fileName);
  } catch (error: any) {
    console.error("Error refreshing signed URL:", error);
    throw error;
  }
};

// Delete file from Google Cloud Storage
export const deleteFromGCS = async (fileUrl: string): Promise<boolean> => {
  try {
    if (!fileUrl) {
      return false;
    }

    // Extract file name from URL (handle both public URLs and signed URLs)
    const urlParts = fileUrl.split(`${config.gcs.bucketName}/`);

    if (urlParts.length < 2) {
      console.error("Invalid file URL format");
      return false;
    }

    // Remove query parameters if present (from signed URLs)
    const fileNameWithParams = urlParts[1];
    const fileName = fileNameWithParams.split("?")[0];

    await bucket.file(fileName).delete();
    console.log(`File deleted from GCS: ${fileName}`);
    return true;
  } catch (error: any) {
    if (error.code === 404) {
      console.log("File not found in GCS, might be already deleted");
      return true;
    }
    console.error("Error deleting from GCS:", error);
    return false;
  }
};

// Upload video with validation
export const uploadVideo = async (
  file: Express.Multer.File
): Promise<UploadResult> => {
  // Validate file type
  const allowedMimeTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/x-matroska",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error("Invalid file type. Only video files are allowed.");
  }

  // Validate file size
  if (file.size > config.upload.maxVideoSize) {
    throw new Error(
      `File size exceeds the maximum limit of ${
        config.upload.maxVideoSize / (1024 * 1024)
      }MB`
    );
  }

  return uploadToGCS(file, config.gcs.paths.video || "videos");
};

// Upload document (PDF, DOCX, PPTX, TXT) with validation
export const uploadDocument = async (
  file: Express.Multer.File,
  subfolder: string = "files"
): Promise<UploadResult> => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
    "text/plain", // txt
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(
      "Invalid file type. Only PDF, DOCX, PPTX, XLSX, and TXT files are allowed."
    );
  }

  // Max 100MB for documents
  const maxDocSize = 100 * 1024 * 1024;
  if (file.size > maxDocSize) {
    throw new Error(`Document size exceeds the maximum limit of 100MB`);
  }

  const folder = `publications/${subfolder}`;
  return uploadToGCS(file, folder);
};

// Upload image for publications with validation
export const uploadPublicationImage = async (
  file: Express.Multer.File,
  subfolder: string = "covers"
): Promise<UploadResult> => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(
      "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed."
    );
  }

  // Max 10MB for images
  const maxImageSize = 10 * 1024 * 1024;
  if (file.size > maxImageSize) {
    throw new Error(`Image size exceeds the maximum limit of 10MB`);
  }

  const folder = `publications/${subfolder}`;
  return uploadToGCS(file, folder);
};

// Upload audio file for blogs with validation
export const uploadBlogAudio = async (
  file: Express.Multer.File
): Promise<UploadResult> => {
  const allowedMimeTypes = [
    "audio/mpeg", // mp3
    "audio/mp3", // mp3 alternate
    "audio/wav", // wav
    "audio/wave", // wav alternate
    "audio/x-wav", // wav alternate
    "audio/ogg", // ogg
    "audio/webm", // webm
    "audio/aac", // aac
    "audio/m4a", // m4a
    "audio/x-m4a", // m4a alternate
    "audio/mp4", // mp4 audio
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(
      "Invalid file type. Only MP3, WAV, OGG, WebM, AAC, and M4A audio files are allowed."
    );
  }

  // Max 500MB for audio files
  const maxAudioSize = 500 * 1024 * 1024;
  if (file.size > maxAudioSize) {
    throw new Error(`Audio file size exceeds the maximum limit of 500MB`);
  }

  return uploadToGCS(file, "blog-audio");
};

// Delete blog audio from GCS
export const deleteBlogAudio = async (fileName: string): Promise<boolean> => {
  try {
    if (!fileName) {
      return false;
    }

    await bucket.file(fileName).delete();
    console.log(`Blog audio deleted from GCS: ${fileName}`);
    return true;
  } catch (error: any) {
    if (error.code === 404) {
      console.log("Blog audio not found in GCS, might be already deleted");
      return true;
    }
    console.error("Error deleting blog audio from GCS:", error);
    return false;
  }
};

// Check if GCS is properly configured and accessible
// Uses getFiles instead of bucket.exists() to avoid needing storage.buckets.get permission
export const testConnection = async (): Promise<void> => {
  try {
    await bucket.getFiles({
      prefix: config.gcs.paths.video,
      maxResults: 1,
      autoPaginate: false,
    });
    console.log("GCS connection successful✅");
  } catch (error: any) {
    if (error.code === 403) {
      console.error("GCS Permission Error:", error.message);
      console.error(
        'Please ensure service account has "Storage Object Admin" role'
      );
    } else if (error.code === 404) {
      console.error(`Bucket "${config.gcs.bucketName}" does not exist`);
    } else {
      console.error("GCS connection failed:", error.message);
    }
    throw error; // Throw to indicate failure
  }
};

export const googleCloudStorage = {
  uploadToGCS,
  deleteFromGCS,
  uploadVideo,
  uploadDocument,
  uploadPublicationImage,
  uploadBlogAudio,
  deleteBlogAudio,
  refreshSignedUrl,
  testConnection,
};
