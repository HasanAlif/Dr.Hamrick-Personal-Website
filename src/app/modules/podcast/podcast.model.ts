import mongoose, { Document, Schema, Types } from "mongoose";

export enum PodcastStatus {
  SCHEDULED = "scheduled",
  LIVE = "live",
  ENDED = "ended",
  CANCELLED = "cancelled",
}

export interface IListener {
  userId?: Types.ObjectId;
  joinedAt: Date;
  leftAt?: Date;
  sessionId: string;
}

export interface IStreamConfig {
  channelId: string;
  sessionId: string | null;
  socketNamespace: string;
  socketEndpoint: string;
  playbackMethod: string;
  playbackUrl: string | null;
  recordingBucket: string;
  roomId: string;
}

export interface IPodcast extends Document {
  title: string;
  description?: string;
  coverImage?: string;
  transcription?: string;
  date?: Date;
  status: PodcastStatus;
  admin: Types.ObjectId;

  // Live session data
  liveSessionId?: string;
  actualStart?: Date;
  actualEnd?: Date;
  duration?: number;

  // Listener tracking
  currentListeners: number;
  peakListeners: number;
  totalListeners: number;
  podcastListeners: IListener[];

  // Recording
  recordedAudioUrl?: string;
  recordedSignedUrl?: string;
  recordedFileName?: string;
  audioSize?: number;
  audioFormat?: string;
  isRecording: boolean;

  // Streaming configuration (virtual)
  streamConfig?: IStreamConfig;

  // Notification tracking
  isNotified: boolean;
  isPinned: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const ListenerSchema = new Schema<IListener>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    joinedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    leftAt: {
      type: Date,
    },
    sessionId: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const PodcastSchema = new Schema<IPodcast>(
  {
    title: {
      type: String,
      required: [true, "Podcast title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    coverImage: {
      type: String,
      default: "",
    },
    transcription: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(PodcastStatus),
      default: PodcastStatus.SCHEDULED,
      index: true,
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Admin is required"],
      index: true,
    },
    liveSessionId: {
      type: String,
    },
    actualStart: {
      type: Date,
    },
    actualEnd: {
      type: Date,
    },
    duration: {
      type: Number,
      min: 0,
    },
    currentListeners: {
      type: Number,
      default: 0,
      min: 0,
    },
    peakListeners: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalListeners: {
      type: Number,
      default: 0,
      min: 0,
    },
    podcastListeners: {
      type: [ListenerSchema],
      default: [],
    },
    recordedAudioUrl: {
      type: String,
    },
    recordedSignedUrl: {
      type: String,
    },
    recordedFileName: {
      type: String,
    },
    audioSize: {
      type: Number,
      min: 0,
    },
    audioFormat: {
      type: String,
      enum: ["webm", "mp3", "ogg"],
      default: "webm",
    },
    isRecording: {
      type: Boolean,
      default: true,
    },
    isNotified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
PodcastSchema.index({ status: 1, date: -1 });
PodcastSchema.index({ status: 1, createdAt: -1 });
PodcastSchema.index({ admin: 1, status: 1 });

// Compound index for efficient pinned sorting
PodcastSchema.index({ isPinned: -1, createdAt: -1 });

// Virtual for active listeners
PodcastSchema.virtual("activeListeners").get(function () {
  return this.podcastListeners.filter((l) => !l.leftAt).length;
});

// Pre-save middleware to calculate current listeners
PodcastSchema.pre("save", function (next) {
  if (this.isModified("podcastListeners")) {
    this.currentListeners = this.podcastListeners.filter(
      (l) => !l.leftAt
    ).length;
    if (this.currentListeners > this.peakListeners) {
      this.peakListeners = this.currentListeners;
    }
  }
  next();
});

const Podcast = mongoose.model<IPodcast>("Podcast", PodcastSchema);

export default Podcast;
