import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import {
  S3Client,
  PutObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import streamifier from "streamifier";
import dotenv from "dotenv";

dotenv.config();

// Configure DigitalOcean Spaces
const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: process.env.DO_SPACE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.DO_SPACE_ACCESS_KEY || "",
    secretAccessKey: process.env.DO_SPACE_SECRET_KEY || "",
  },
});

// Configure Cloudinary with increased timeout for large files
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  // Increase timeout to 10 minutes for large image uploads
  timeout: 600000,
});

// File filter for profile images (only allow images)
const profileImageFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Allowed image types
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // Accept file
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, JPG, PNG, and WEBP images are allowed."
      )
    );
  }
};

// Multer configuration using memoryStorage (for DigitalOcean & Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadProfilePicture = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: profileImageFilter,
});

// ✅ Fixed Cloudinary Storage
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    public_id: (req, file) => `${Date.now()}_${file.originalname}`,
  },
});

const cloudinaryUpload = multer({ storage: cloudinaryStorage });

// Upload single image
const uploadSingle = upload.single("image");
const uploadFile = upload.single("file");

// Upload multiple images
const uploadMultipleImage = upload.fields([{ name: "images", maxCount: 15 }]);
const uploadMultipleFiles = upload.fields([{ name: "files", maxCount: 15 }]);

// Upload profile and banner images
const userMutipleFiles = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "image", maxCount: 1 },
]);

// ✅ Enhanced Cloudinary Upload with better file handling
const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string = "uploads"
): Promise<{ Location: string; public_id: string }> => {
  if (!file) {
    throw new Error("File is required for uploading.");
  }

  return new Promise((resolve, reject) => {
    // Generate unique filename
    const uniqueFilename = `${Date.now()}_${Math.random()
      .toString(36)
      .substring(2)}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto", // Supports images, videos, etc.
        public_id: uniqueFilename.split(".")[0], // Remove extension for public_id
        unique_filename: true,
        overwrite: false,
        quality: "auto",
        fetch_format: "auto",
        // Set timeout to 10 minutes for large images
        timeout: 600000,
      },
      (error, result) => {
        if (error) {
          console.error("Error uploading file to Cloudinary:", error);
          
          // Provide specific error message
          if (error.message?.includes('timeout') || error.http_code === 499) {
            return reject(
              new Error(
                "Upload timeout: The file took too long to upload to Cloudinary. Please try again or use a smaller file."
              )
            );
          }
          
          return reject(error);
        }

        // ✅ Explicitly return `Location` and `public_id`
        resolve({
          Location: result?.secure_url || "", // Cloudinary URL
          public_id: result?.public_id || "",
        });
      }
    );

    // Support both buffer (memory storage) and file path (disk storage)
    if (file.buffer && file.buffer.length > 0) {
      // File in memory - stream from buffer
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    } else if (file.path && require('fs').existsSync(file.path)) {
      // File on disk - stream from file path
      const fs = require('fs');
      const readStream = fs.createReadStream(file.path);
      
      readStream.on('error', (err: any) => {
        console.error('Error reading file for Cloudinary upload:', err);
        reject(new Error(`Failed to read file: ${err.message}`));
      });
      
      readStream.pipe(uploadStream);
    } else {
      reject(new Error('File has no buffer or path - cannot upload'));
    }
  });
};

// ✅ Unchanged: DigitalOcean Upload
const uploadToDigitalOcean = async (file: Express.Multer.File) => {
  if (!file) {
    throw new Error("File is required for uploading.");
  }

  try {
    const Key = `nathancloud/${Date.now()}_${uuidv4()}_${file.originalname}`;
    const uploadParams = {
      Bucket: process.env.DO_SPACE_BUCKET || "",
      Key,
      Body: file.buffer, // ✅ Use buffer instead of file path
      ACL: "public-read" as ObjectCannedACL,
      ContentType: file.mimetype,
    };

    // Upload file to DigitalOcean Spaces
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Format the URL
    const fileURL = `${process.env.DO_SPACE_ENDPOINT}/${process.env.DO_SPACE_BUCKET}/${Key}`;
    return {
      Location: fileURL,
      Bucket: process.env.DO_SPACE_BUCKET || "",
      Key,
    };
  } catch (error) {
    console.error("Error uploading file to DigitalOcean:", error);
    throw error;
  }
};

// Upload profile image specifically with optimizations
const uploadProfileImage = async (file: Express.Multer.File) => {
  return uploadToCloudinary(file, "profile-images");
};

// Upload general file
const uploadGeneralFile = async (file: Express.Multer.File) => {
  return uploadToCloudinary(file, "user-files");
};

// Extract public_id from Cloudinary URL
const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) {
      return null;
    }

    const splitUrl = url.split("/");
    const uploadIndex = splitUrl.indexOf("upload");

    if (uploadIndex !== -1 && uploadIndex + 2 < splitUrl.length) {
      const pathAfterUpload = splitUrl.slice(uploadIndex + 2);
      const publicId = pathAfterUpload.join("/").split(".")[0];
      return publicId;
    }

    return null;
  } catch (error) {
    console.error("Error extracting public_id from URL:", error);
    return null;
  }
};

// Function to delete a file from Cloudinary
const deleteFromCloudinary = async (url: string): Promise<boolean> => {
  try {
    const publicId = extractPublicIdFromUrl(url);

    if (!publicId) {
      console.warn("Could not extract public_id from URL:", url);
      return false;
    }

    // Destroy the image in Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    console.log("Cloudinary delete result:", result);
    return result.result === "ok" || result.result === "not found";
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    return false;
  }
};

// ✅ No Name Changes, Just Fixes
export const fileUploader = {
  upload,
  uploadSingle,
  uploadMultipleFiles,
  uploadMultipleImage,
  userMutipleFiles,
  uploadFile,
  cloudinaryUpload,
  uploadToDigitalOcean,
  uploadToCloudinary,
  uploadProfileImage,
  uploadGeneralFile,
  deleteFromCloudinary,
  uploadProfilePicture, // New: For profile image uploads with validation
  extractPublicIdFromUrl, // New: Helper to extract public_id
};
