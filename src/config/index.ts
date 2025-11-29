import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  env: process.env.NODE_ENV,
  database_url: process.env.DATABASE_URL,
  port: process.env.PORT,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    expires_in: process.env.EXPIRES_IN,
    refresh_token_secret: process.env.REFRESH_TOKEN_SECRET,
    refresh_token_expires_in: process.env.REFRESH_TOKEN_EXPIRES_IN,
    reset_pass_secret: process.env.RESET_PASS_TOKEN,
    reset_pass_token_expires_in: process.env.RESET_PASS_TOKEN_EXPIRES_IN,
  },
  reset_pass_link: process.env.RESET_PASS_LINK,
  emailSender: {
    email: process.env.EMAIL,
    app_pass: process.env.APP_PASS,
  },

  site_name: process.env.WEBSITE_NAME,
  contact_mail: process.env.CONTACT_MAIL,

  // Server URL for streaming endpoints
  serverUrl:
    process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5005}`,

  // Google Cloud Storage Configuration
  gcs: {
    projectId: process.env.GCS_PROJECT_ID,
    bucketName: process.env.GCS_BUCKET_NAME,
    keyFile: process.env.GCS_KEY_FILE,
    paths: {
      video: process.env.GCS_VIDEO_PATH,
      thumbnail: process.env.GCS_THUMBNAIL_PATH,
    },
  },

  upload: {
    maxVideoSize: Number(process.env.MAX_VIDEO_SIZE) || 5368709120, // 5GB default
  },
};
