import { Server as SocketIOServer, Socket } from "socket.io";
import Podcast, {
  PodcastStatus,
  IListener,
} from "../app/modules/podcast/podcast.model";
import audioStreamService from "../app/modules/podcast/audioStreamService";

// Cache for stream headers to support late joiners
const activeStreams = new Map<
  string,
  { header: string; mimeType: string; sessionId: string }
>();

export function initializeSocketHandlers(io: SocketIOServer): void {
  const podcastNamespace = io.of("/podcast");

  podcastNamespace.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Admin broadcasts audio chunk
    socket.on(
      "broadcast-audio",
      async (data: {
        sessionId: string;
        audioChunk: string;
        podcastId: string;
        mimeType?: string;
        isHeader?: boolean;
      }) => {
        try {
          const { sessionId, audioChunk, podcastId, mimeType, isHeader } = data;

          console.log(
            `[BROADCAST] Received audio chunk: ${
              audioChunk?.length || 0
            } chars for podcast ${podcastId} ${isHeader ? "(HEADER)" : ""}`
          );

          // Cache the first chunk (header) for new listeners
          // Update cache if it's explicitly marked as a header, OR if we don't have a header for this session yet
          if (
            isHeader ||
            !activeStreams.has(podcastId) ||
            activeStreams.get(podcastId)?.sessionId !== sessionId
          ) {
            activeStreams.set(podcastId, {
              header: audioChunk,
              mimeType: mimeType || "audio/webm",
              sessionId,
            });
            console.log(
              `[BROADCAST] Cached header for podcast ${podcastId} (Session: ${sessionId})`
            );
          }

          // Verify podcast is live
          const podcast = await Podcast.findById(podcastId);
          if (!podcast || podcast.status !== PodcastStatus.LIVE) {
            console.log(
              `[BROADCAST] Error: Podcast not live. Status: ${podcast?.status}, ID: ${podcastId}`
            );
            socket.emit("error", {
              message: "Podcast is not live. Did you call the start endpoint?",
            });
            return;
          }

          // Convert base64 audio chunk to buffer
          const audioBuffer = Buffer.from(audioChunk, "base64");

          // Append to recording
          if (podcast.isRecording && sessionId) {
            const appended = audioStreamService.appendAudioChunk(
              sessionId,
              audioBuffer
            );
            console.log(
              `[BROADCAST] Audio chunk ${
                appended ? "appended" : "failed"
              } to recording`
            );
          }

          // Broadcast to all listeners in the room
          socket.to(podcastId).emit("audio-stream", {
            audioChunk,
            mimeType: mimeType || "audio/webm",
            timestamp: Date.now(),
          });

          console.log(`[BROADCAST] Audio broadcasted to room ${podcastId}`);
        } catch (error) {
          console.error("Error broadcasting audio:", error);
          socket.emit("error", { message: "Failed to broadcast audio" });
        }
      }
    );

    // Listener joins podcast
    socket.on(
      "join-podcast",
      async (data: { podcastId: string; userId?: string }) => {
        try {
          const { podcastId, userId } = data;

          const podcast = await Podcast.findById(podcastId);
          if (!podcast) {
            socket.emit("error", { message: "Podcast not found" });
            return;
          }

          // Join room
          socket.join(podcastId);

          // Send cached header if available
          if (activeStreams.has(podcastId)) {
            const streamData = activeStreams.get(podcastId);
            socket.emit("audio-stream", {
              audioChunk: streamData?.header,
              mimeType: streamData?.mimeType,
              timestamp: Date.now(),
            });
            console.log(`[JOIN] Sent cached header to listener ${socket.id}`);
          }

          // Add listener
          podcast.podcastListeners.push({
            userId: userId || undefined,
            joinedAt: new Date(),
            sessionId: socket.id,
          } as any);

          await podcast.save();

          // Notify all clients about listener count
          podcastNamespace.to(podcastId).emit("listener-update", {
            currentListeners: podcast.currentListeners,
            peakListeners: podcast.peakListeners,
            totalListeners: podcast.totalListeners,
          });

          socket.emit("joined-podcast", {
            podcastId,
            currentListeners: podcast.currentListeners,
          });

          console.log(`Listener ${socket.id} joined podcast ${podcastId}`);
        } catch (error) {
          console.error("Error joining podcast:", error);
          socket.emit("error", { message: "Failed to join podcast" });
        }
      }
    );

    // Listener leaves podcast
    socket.on("leave-podcast", async (data: { podcastId: string }) => {
      try {
        const { podcastId } = data;

        const podcast = await Podcast.findById(podcastId);
        if (!podcast) return;

        // Mark listener as left
        const listener = podcast.podcastListeners.find(
          (l: IListener) => l.sessionId === socket.id && !l.leftAt
        );

        if (listener) {
          listener.leftAt = new Date();
          await podcast.save();

          // Notify all clients
          podcastNamespace.to(podcastId).emit("listener-update", {
            currentListeners: podcast.currentListeners,
            peakListeners: podcast.peakListeners,
            totalListeners: podcast.totalListeners,
          });
        }

        socket.leave(podcastId);
        console.log(`Listener ${socket.id} left podcast ${podcastId}`);
      } catch (error) {
        console.error("Error leaving podcast:", error);
      }
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      try {
        const podcasts = await Podcast.find({
          "podcastListeners.sessionId": socket.id,
          "podcastListeners.leftAt": { $exists: false },
        });

        for (const podcast of podcasts) {
          const listener = podcast.podcastListeners.find(
            (l: IListener) => l.sessionId === socket.id && !l.leftAt
          );

          if (listener) {
            listener.leftAt = new Date();
            await podcast.save();

            podcastNamespace
              .to((podcast._id as any).toString())
              .emit("listener-update", {
                currentListeners: podcast.currentListeners,
                peakListeners: podcast.peakListeners,
                totalListeners: podcast.totalListeners,
              });
          }
        }
      } catch (error) {
        console.error("Error handling disconnect:", error);
      }
    });
  });

  console.log("✓ Socket.IO initialized for audio podcasting");
}
