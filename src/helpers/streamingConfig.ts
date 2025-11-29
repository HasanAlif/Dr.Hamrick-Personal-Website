import config from "../config";

// Generate streaming configuration for a podcast using Socket.IO
export interface StreamConfig {
  channelId: string;
  sessionId: string | null;
  socketNamespace: string;
  socketEndpoint: string;
  playbackMethod: string;
  playbackUrl: string | null;
  recordingBucket: string;
  roomId: string;
}

// Get base Socket.IO endpoint URL
function getSocketEndpoint(): string {
  // Replace http/https with ws/wss for WebSocket
  const serverUrl = config.serverUrl
    .replace("http://", "ws://")
    .replace("https://", "wss://");
  return `${serverUrl}/socket.io`;
}

// Generate streaming configuration for scheduled/idle podcast
export function generateStreamConfig(podcastId: string): StreamConfig {
  return {
    channelId: `podcast_${podcastId}`,
    sessionId: null,
    socketNamespace: "/podcast",
    socketEndpoint: getSocketEndpoint(),
    playbackMethod: "socket.io",
    playbackUrl: null,
    recordingBucket: `gs://${config.gcs.bucketName}/podcasts/`,
    roomId: podcastId,
  };
}

// Generate streaming configuration for live podcast with active session
export function generateLiveStreamConfig(
  podcastId: string,
  sessionId: string
): StreamConfig {
  const socketEndpoint = getSocketEndpoint();

  return {
    channelId: `podcast_${podcastId}`,
    sessionId,
    socketNamespace: "/podcast",
    socketEndpoint,
    playbackMethod: "socket.io",
    playbackUrl: `${socketEndpoint}?namespace=/podcast&room=${podcastId}`,
    recordingBucket: `gs://${config.gcs.bucketName}/podcasts/`,
    roomId: podcastId,
  };
}

// Generate streaming configuration for ended podcast with recording
export function generateRecordedStreamConfig(
  podcastId: string,
  sessionId: string,
  recordingUrl: string | null
): StreamConfig {
  return {
    channelId: `podcast_${podcastId}`,
    sessionId,
    socketNamespace: "/podcast",
    socketEndpoint: getSocketEndpoint(),
    playbackMethod: recordingUrl ? "direct" : "socket.io",
    playbackUrl: recordingUrl || null,
    recordingBucket: `gs://${config.gcs.bucketName}/podcasts/`,
    roomId: podcastId,
  };
}

// Get stream health status
export function getStreamHealth(
  actualStart: Date | undefined,
  currentListeners: number,
  peakListeners: number
): {
  isLive: boolean;
  uptime: number | null;
  listenerMetrics: {
    current: number;
    peak: number;
  };
} {
  const isLive = !!actualStart;
  const uptime = actualStart
    ? Math.floor((Date.now() - actualStart.getTime()) / 1000)
    : null;

  return {
    isLive,
    uptime,
    listenerMetrics: {
      current: currentListeners,
      peak: peakListeners,
    },
  };
}
