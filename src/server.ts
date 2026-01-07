// Force server to run in UTC timezone - MUST be before any imports
process.env.TZ = "UTC";

// Increase Node.js memory limit and optimize for large file handling
// This should be set via NODE_OPTIONS in production: --max-old-space-size=8192
// Increase HTTP/HTTPS agent keep-alive settings for better connection reuse
import http from "http";
import https from "https";

// Configure HTTP/HTTPS agents for better performance with large uploads
// Create custom agents with keep-alive enabled
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 60000, // 60 seconds
  maxSockets: 50,
  maxFreeSockets: 10,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 60000,
  maxSockets: 50,
  maxFreeSockets: 10,
});

// Replace global agents
(http as any).globalAgent = httpAgent;
(https as any).globalAgent = httpsAgent;

import { Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import config from "./config";
import "./shared/database";
import app from "./app";
import { testConnection } from "./helpers/googleCloudStorage";
import { corsOptions } from "./app";
import { initializeSocketHandlers } from "./socket/socketHandler";
import { startSignedUrlRefreshJob } from "./jobs/refreshSignedUrls";
import { startScheduledBlogPublisher } from "./jobs/publishScheduledBlogs";

let server: Server;
let io: SocketIOServer;

async function startServer() {
  // Test Google Cloud Storage connection
  try {
    await testConnection();
    console.log("✓ Google Cloud Storage connected successfully✨");
  } catch (error) {
    console.error("✗ Google Cloud Storage connection failed:", error);
    console.error("Video upload functionality will not work!");
  }

  // Create HTTP server
  server = app.listen(config.port, () => {
    console.log("Server is Firing 🚀 on port ", config.port, "🔥");
  });

  // Initialize Socket.IO
  io = new SocketIOServer(server, {
    cors: corsOptions,
    maxHttpBufferSize: 5e9, // 5GB for large video/audio uploads
    pingTimeout: 120000, // 2 minutes
    pingInterval: 25000,
    // Add connection timeout for long uploads
    connectTimeout: 120000,
  });

  // Attach io to app for use in controllers
  app.set("io", io);

  // Initialize podcast Socket.IO handlers
  initializeSocketHandlers(io);

  // Initialize signed URL refresh cron job
  startSignedUrlRefreshJob();

  // Initialize scheduled blog publisher cron job
  startScheduledBlogPublisher();
}

async function main() {
  await startServer();

  const exitHandler = () => {
    if (server) {
      // Close Socket.IO
      if (io) {
        io.close();
      }

      server.close(() => {
        console.info("Server closed!");
        process.exit(0);
      });
    } else {
      process.exit(1);
    }
  };

  process.on("uncaughtException", (error) => {
    console.log("Uncaught Exception: ", error);
    exitHandler();
  });

  process.on("unhandledRejection", (error) => {
    console.log("Unhandled Rejection: ", error);
    exitHandler();
  });

  // Handling the server shutdown with SIGTERM and SIGINT
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received. Shutting down gracefully...");
    exitHandler();
  });

  process.on("SIGINT", () => {
    console.log("SIGINT signal received. Shutting down gracefully...");
    exitHandler();
  });
}

main();
