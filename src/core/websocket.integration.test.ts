import { it, expect } from "vitest";
import { describeWithTokens } from "../test-utils/testConfig";
import { getFeaturedLivestreams } from "../apis/private/featuredLivestreams";
import { createWebSocket } from "./websocket";
import { parseMessage } from "./messageHandling";

describeWithTokens("WebSocket Integration Tests", () => {
  it("should connect to a live channel and receive real chat messages", async () => {
    console.log("Fetching featured livestreams to find a live channel...");

    const featuredResponse = await getFeaturedLivestreams({
      language: "en",
      sort: "viewers_high_to_low",
    });

    expect(featuredResponse).not.toBeNull();
    expect(featuredResponse?.data.livestreams).toBeDefined();
    expect(featuredResponse?.data.livestreams.length).toBeGreaterThan(0);

    const liveChannel = featuredResponse!.data.livestreams[0];
    expect(liveChannel).toBeDefined();

    console.log(
      `Found live channel: ${liveChannel!.channel.username} (${liveChannel!.viewer_count} viewers)`,
    );

    // Need to get chatroom ID from channel data
    const { getChannelData } = await import("../apis/private/channelData");
    const channelData = await getChannelData(liveChannel!.channel.slug);

    expect(channelData).not.toBeNull();
    expect(channelData?.chatroom).toBeDefined();

    const chatroomId = channelData!.chatroom.id;
    console.log(`Connecting to chatroom ID: ${chatroomId}`);

    // Create WebSocket connection
    const socket = createWebSocket(chatroomId);

    // Track messages received
    const messagesReceived: unknown[] = [];
    let connectionEstablished = false;

    // Wait for messages
    const messagePromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Timeout: Only received ${messagesReceived.length} messages in 30 seconds`,
          ),
        );
      }, 30000);

      socket.on("open", () => {
        console.log("WebSocket connection opened");
        connectionEstablished = true;
      });

      socket.on("message", (data) => {
        const dataStr = Buffer.isBuffer(data) ? data.toString() : String(data);
        const parsed = parseMessage(dataStr);

        if (parsed) {
          messagesReceived.push(parsed);

          // Consider test successful after receiving 3 messages
          if (messagesReceived.length >= 3) {
            console.log(
              `✓ Received ${messagesReceived.length} messages, test criteria met`,
            );
            clearTimeout(timeout);
            resolve();
          }
        }
      });

      socket.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    try {
      await messagePromise;

      // Verify we established connection
      expect(connectionEstablished).toBe(true);

      // Verify we received messages
      expect(messagesReceived.length).toBeGreaterThanOrEqual(3);

      // Verify messages look real (have expected structure)
      const hasValidMessage = messagesReceived.some((msg: any) => {
        if (msg.type === "ChatMessage") {
          return (
            msg.data &&
            typeof msg.data === "object" &&
            "content" in msg.data &&
            "sender" in msg.data
          );
        }
        // Other message types are also valid
        return true;
      });

      expect(hasValidMessage).toBe(true);

      console.log(`Test passed! Received ${messagesReceived.length} messages`);
    } finally {
      socket.close();
    }
  }, 60000);
});