# PG-65 Backend API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-Storage-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)

**A production-ready, enterprise-grade RESTful API powering Dr. Irene Hamrick's multimedia content platform**

[Live Demo](https://api.pg-65.com) | [Frontend](https://www.pg-65.com)

</div>

---

## Overview

This backend system powers a comprehensive content management and streaming platform for a healthcare professional. Built with scalability, security, and performance in mind, it handles everything from real-time live podcast streaming to large video uploads (up to 5GB) with enterprise-grade cloud storage integration.

### Key Highlights

- **Real-time Live Streaming** - WebSocket-based live podcast broadcasting with listener tracking
- **Large File Handling** - Resumable uploads supporting files up to 5GB with Google Cloud Storage
- **Multi-Cloud Architecture** - Seamless integration with GCS, Cloudinary, and DigitalOcean Spaces
- **Automated Scheduling** - CRON-based blog publishing and URL refresh systems
- **Intelligent Search** - Unified search engine with relevance scoring across all content types
- **Email Notification System** - Batch email processing for subscriber notifications

---

## Architecture

```
src/
├── app/
│   ├── middlewares/        # Auth, validation, error handling
│   ├── models/             # Mongoose schemas and interfaces
│   ├── modules/            # Feature modules (controller, service, routes)
│   │   ├── auth/           # JWT authentication & OTP password reset
│   │   ├── blog/           # Blog management with audio support
│   │   ├── videos/         # Video uploads with transcription
│   │   ├── podcast/        # Live streaming & recordings
│   │   ├── publications/   # Document management (PDF, DOCX, PPTX)
│   │   ├── search/         # Global search with relevance scoring
│   │   ├── notification/   # Email notification system
│   │   └── ...
│   └── routes/             # Centralized route definitions
├── helpers/                # Utility functions & cloud integrations
├── jobs/                   # CRON jobs for scheduled tasks
├── socket/                 # Socket.IO handlers for real-time features
├── config/                 # Environment configuration
└── shared/                 # Common utilities & database connection
```

---

## Core Features

### 1. Authentication & Authorization

- **JWT-based authentication** with configurable token expiration
- **Multi-source token support** - Bearer header, cookies, query params, custom headers
- **Role-based access control** (Admin, Guest, Professional)
- **OTP-based password reset** with email verification
- **Account status management** (Active, Inactive, Blocked)

```typescript
// Flexible authentication supporting multiple token sources
const auth = (...roles: string[]) => {
  // Supports: Authorization header, cookies, query params, x-auth-token header
};
```

### 2. Real-Time Live Podcast Streaming

The crown jewel of this system - a fully functional live audio streaming platform:

- **WebSocket-based broadcasting** using Socket.IO namespaces
- **Live listener tracking** with join/leave events and peak listener metrics
- **Audio chunk caching** for late-joiner support
- **Automatic recording** with cloud storage persistence
- **Real-time listener count updates** broadcasted to all connected clients

```typescript
// Socket.IO namespace for podcast streaming
podcastNamespace.on("connection", (socket) => {
  socket.on("broadcast-audio", async (data) => {
    // Cache header for late joiners
    // Append to recording
    // Broadcast to all listeners
  });
});
```

### 3. Enterprise-Grade File Management

#### Google Cloud Storage Integration
- **Resumable uploads** for files up to 5GB with automatic retry
- **Signed URLs** with configurable expiration (7-day default)
- **Automated URL refresh** via CRON jobs every 6 days
- **Multi-format support** - Videos, Audio, Documents, Images

```typescript
// Optimized for large file uploads
const uploadToGCS = async (file, folder) => {
  // Resumable upload for files > 10MB
  // 8MB chunk streaming
  // Automatic temp file cleanup
  // 120-minute timeout for large files
};
```

#### Multi-Cloud Strategy
| Service | Purpose | File Types |
|---------|---------|------------|
| Google Cloud Storage | Videos, Audio, Documents | MP4, WebM, MP3, PDF, DOCX |
| Cloudinary | Images & Thumbnails | JPEG, PNG, WebP, GIF |
| DigitalOcean Spaces | Backup Storage | All file types |

### 4. Intelligent Content Management

#### Blog System
- **Rich content support** with HTML descriptions
- **Audio attachments** for podcast-style blogs
- **Scheduled publishing** with CRON-based automation
- **Pin functionality** for featured content
- **Soft delete** with data preservation

#### Video Platform
- **Large file uploads** (up to 5GB)
- **Transcription support** for accessibility
- **View tracking** and analytics
- **Thumbnail management** via Cloudinary
- **External video URL support**

#### Publications Hub
- **Multi-format documents** - PDF, DOCX, PPTX, XLSX, TXT
- **Author attribution** and publication dates
- **Cover image support**
- **Status management** (Published/Unpublished)

### 5. Global Search Engine

Unified search across all content types with intelligent relevance scoring:

```typescript
const FIELD_WEIGHTS = {
  title: 10,        // Highest priority
  description: 5,   // Secondary match
  transcription: 3, // Tertiary match
  author: 7,        // Publication-specific
};

// Exact title match bonus: +20 points
// Results sorted by relevance score (descending)
```

**Features:**
- Cross-content type searching (blogs, videos, podcasts, publications)
- Keyword highlighting with `<mark>` tags
- Pagination with result aggregation by type
- Execution time tracking for performance monitoring

### 6. Notification System

Automated email notifications for content updates:

- **Batch processing** (50 emails per batch) with rate limiting
- **Beautiful HTML templates** with responsive design
- **Live podcast alerts** with special formatting
- **Content aggregation** - notifies about all new content types at once
- **Duplicate prevention** via `isNotified` flags

### 7. Scheduled Tasks (CRON Jobs)

| Job | Schedule | Purpose |
|-----|----------|---------|
| Blog Publisher | Every hour | Auto-publish scheduled blogs |
| URL Refresh | Every 6 days | Refresh GCS signed URLs |

```typescript
// All CRON jobs run in UTC timezone
cron.schedule("0 * * * *", publishScheduledBlogs, { timezone: "UTC" });
cron.schedule("0 2 */6 * *", refreshAllSignedUrls, { timezone: "UTC" });
```

---

## Technical Implementation

### Request Validation

Using **Zod** for type-safe runtime validation:

```typescript
const createBlogSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(["published", "unpublished", "scheduled"]),
  scheduledAt: z.string().datetime().optional(),
});
```

### Error Handling

Centralized error handling with custom API errors:

```typescript
class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Global error handler middleware
const GlobalErrorHandler = (error, req, res, next) => {
  // Handles Zod validation, Mongoose errors, JWT errors, and custom API errors
};
```

### Database Optimization

Strategic MongoDB indexing for performance:

```typescript
// Compound indexes for efficient queries
BlogSchema.index({ status: 1, scheduledAt: 1 }); // CRON job queries
VideoSchema.index({ isPinned: -1, createdAt: -1 }); // Homepage listings
PodcastSchema.index({ admin: 1, status: 1 }); // Admin dashboard
```

### Security Features

- **CORS configuration** with whitelist-based origin control
- **Bcrypt password hashing** with configurable salt rounds
- **HTTP-only cookies** for secure token storage
- **Request size limits** optimized for large file uploads
- **File type validation** at upload time

---

## API Modules

| Module | Endpoints | Description |
|--------|-----------|-------------|
| `/api/auth` | 10 | Authentication, password reset, profile management |
| `/api/blog` | 8 | Blog CRUD, pinning, scheduled publishing |
| `/api/videos` | 8 | Video upload, streaming, transcription |
| `/api/podcasts` | 10 | Live streaming, recordings, listener tracking |
| `/api/publications` | 7 | Document management, multi-format support |
| `/api/search` | 2 | Global search with filtering |
| `/api/notifications` | 2 | Email notification triggers |
| `/api/rss-feed` | 3 | Subscriber management |
| `/api/life-suggestions` | 5 | Life tips management |
| `/api/social-links` | 5 | Social media links |
| `/api/website-content` | 5 | CMS for static content |
| `/api/website-images` | 5 | Homepage image management |
| `/api/contact` | 3 | Contact form submissions |

---

## Tech Stack

### Backend Framework
- **Runtime:** Node.js 18.x with optimized memory settings (8GB heap)
- **Framework:** Express.js 4.x with TypeScript 5.5
- **Database:** MongoDB 8.x with Mongoose ODM
- **Real-time:** Socket.IO 4.7 for WebSocket communication

### Cloud Services
- **Storage:** Google Cloud Storage (primary), Cloudinary (images), DigitalOcean Spaces
- **Email:** Nodemailer with Gmail SMTP

### Key Dependencies
```json
{
  "@google-cloud/storage": "^7.17.3",
  "socket.io": "^4.7.5",
  "mongoose": "^8.18.0",
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "zod": "^3.23.8",
  "node-cron": "^3.0.3",
  "cloudinary": "^1.41.3",
  "nodemailer": "^6.9.14"
}
```

---

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- MongoDB 7.x or higher
- Google Cloud Storage account
- Cloudinary account

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pg-65-backend.git

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

```env
# Server
NODE_ENV=production
PORT=8080

# Database
DATABASE_URL=mongodb+srv://...

# JWT
JWT_SECRET=your-secret-key
EXPIRES_IN=7d

# Google Cloud Storage
GCS_PROJECT_ID=your-project
GCS_BUCKET_NAME=your-bucket
GCS_CLIENT_EMAIL=service-account@...
GCS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Email
EMAIL=your-email@gmail.com
APP_PASS=your-app-password
```

---

## Performance Optimizations

- **HTTP Keep-Alive** with optimized socket management
- **Resumable uploads** preventing large file upload failures
- **Batch email processing** with rate limiting
- **MongoDB indexing** for efficient queries
- **Signed URL caching** reducing GCS API calls
- **Memory-efficient streaming** for large file handling

---

## Developer

**Mehedi Hasan Alif**

This project demonstrates expertise in:
- Building scalable Node.js/TypeScript applications
- Real-time communication with WebSockets
- Cloud infrastructure integration (GCS, AWS S3, Cloudinary)
- Database design and optimization with MongoDB
- RESTful API design and implementation
- Authentication and security best practices
- CRON job scheduling and background tasks
- Production deployment and performance optimization

---

## License

This project is proprietary software developed for Dr. Irene Hamrick / PG-65.com.

---

<div align="center">

**Built with precision and passion**

</div>
