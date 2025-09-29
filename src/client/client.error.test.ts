import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "./client";
import { describeWithoutTokens } from "../test-utils/testConfig";

// Mock all the private API modules that client.ts imports
vi.mock("../apis/private/authentication", () => ({
  authentication: vi.fn(),
}));

vi.mock("../apis/private/channelData", () => ({
  getChannelData: vi.fn(),
}));

vi.mock("../apis/private/videoData", () => ({
  getVideoData: vi.fn(),
}));

vi.mock("../apis/private/moderation", () => ({
  deleteMessage: vi.fn(),
  setSlowMode: vi.fn(),
}));

vi.mock("../apis/public/chat", () => ({
  sendChatMessage: vi.fn(),
}));

// Mock validation utility
vi.mock("../utils/utils", () => ({
  validateCredentials: vi.fn(),
}));

// Mock token refresh utilities
vi.mock("../utils/tokenRefresh", () => ({
  refreshOAuthToken: vi.fn(),
  updateEnvTokens: vi.fn(),
  shouldRefreshToken: vi.fn(() => false),
}));

// Mock WebSocket
vi.mock("../core/websocket", () => ({
  createWebSocket: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn(),
  })),
}));

// Import the mocked functions
import { authentication } from "../apis/private/authentication";
import { getChannelData } from "../apis/private/channelData";
import { getVideoData } from "../apis/private/videoData";
import { sendChatMessage } from "../apis/public/chat";

describeWithoutTokens("KickClient Error Handling (Mock Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Clear OAuth environment variables to prevent token refresh logic
    delete process.env.KICK_ACCESS_TOKEN;
    delete process.env.KICK_CLIENT_ID;
    delete process.env.KICK_CLIENT_SECRET;
    delete process.env.KICK_REFRESH_TOKEN;
    delete process.env.KICK_EXPIRES_IN;
    delete process.env.KICK_TOKEN_UPDATED;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Channel Not Found Errors", () => {
    it("should handle channel not found during login with credentials", async () => {
      (authentication as any).mockResolvedValue({
        bearerToken: "test-token",
        xsrfToken: "test-xsrf",
        cookies: "test-cookies",
        isAuthenticated: true,
      });
      (getChannelData as any).mockResolvedValue(null);

      const client = createClient("nonexistent-channel");

      await expect(
        client.login({
          type: "login",
          credentials: {
            username: "testuser",
            password: "testpass",
          },
        }),
      ).rejects.toThrow(
        "Unable to fetch data for channel 'nonexistent-channel'",
      );
    });

    it("should handle channel not found during login with tokens", async () => {
      (getChannelData as any).mockResolvedValue(null);

      const client = createClient("nonexistent-channel");

      await expect(
        client.login({
          type: "tokens",
          credentials: {
            bearerToken: "test-token",
            xsrfToken: "test-xsrf",
            cookies: "test-cookies",
          },
        }),
      ).rejects.toThrow(
        "Unable to fetch data for channel 'nonexistent-channel'",
      );
    });
  });

  describe("Video Not Found Errors", () => {
    it("should handle video not found error", async () => {
      (getVideoData as any).mockRejectedValue(
        new Error(
          "Video 'nonexistent-video' does not exist or has been removed from Kick.com.",
        ),
      );

      const client = createClient("testchannel");

      await expect(client.vod("nonexistent-video")).rejects.toThrow(
        "Video 'nonexistent-video' does not exist or has been removed from Kick.com.",
      );
    });

    it("should handle video data returning null", async () => {
      (getVideoData as any).mockResolvedValue(null);

      const client = createClient("testchannel");

      const result = await client.vod("null-video");
      expect(result).toBeNull();
    });

    it("should handle other video errors gracefully", async () => {
      (getVideoData as any).mockRejectedValue(new Error("Network error"));

      const client = createClient("testchannel");

      await expect(client.vod("error-video")).rejects.toThrow("Network error");
    });
  });

  describe("Authentication Errors", () => {
    it("should handle authentication failure", async () => {
      (authentication as any).mockResolvedValue({
        bearerToken: null,
        xsrfToken: null,
        cookies: "",
        isAuthenticated: false,
      });
      (getChannelData as any).mockResolvedValue({
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      });

      const client = createClient("testchannel");

      const result = await client.login({
        type: "login",
        credentials: {
          username: "testuser",
          password: "wrongpass",
        },
      });

      expect(result).toBe(true); // Function returns true even if auth fails
    });

    it("should handle missing credentials for login type", async () => {
      const client = createClient("testchannel");

      await expect(
        client.login({
          type: "login",
          credentials: undefined as any,
        }),
      ).rejects.toThrow("Credentials are required for login");
    });

    it("should handle missing tokens for tokens type", async () => {
      const client = createClient("testchannel");

      await expect(
        client.login({
          type: "tokens",
          credentials: undefined as any,
        }),
      ).rejects.toThrow("Token credentials are required");
    });

    it("should handle missing OTP secret error", async () => {
      (authentication as any).mockRejectedValue(
        new Error("OTP secret is required"),
      );

      const client = createClient("testchannel");

      await expect(
        client.login({
          type: "login",
          credentials: {
            username: "testuser",
            password: "testpass",
          },
        }),
      ).rejects.toThrow("OTP secret is required");
    });

    it("should handle forbidden request error", async () => {
      (authentication as any).mockRejectedValue(
        new Error("Authentication failed: 403"),
      );

      const client = createClient("testchannel");

      await expect(
        client.login({
          type: "login",
          credentials: {
            username: "testuser",
            password: "testpass",
          },
        }),
      ).rejects.toThrow("Authentication failed: 403");
    });
  });

  describe("Moderation Action Errors", () => {
    it("should throw error when trying to ban without authentication", () => {
      const client = createClient("testchannel");

      expect(() => client.banUser("targetuser")).toThrow(
        "Channel info not available",
      );
    });

    it("should throw error when trying to unban without authentication", () => {
      const client = createClient("testchannel");

      expect(() => client.unbanUser("targetuser")).toThrow(
        "Channel info not available",
      );
    });

    it("should throw error when trying to delete message without authentication", async () => {
      const client = createClient("testchannel");

      await expect(client.deleteMessage("msg123")).rejects.toThrow(
        "Channel info not available",
      );
    });

    it("should throw error when trying to set slow mode without authentication", async () => {
      const client = createClient("testchannel");

      await expect(client.slowMode("on")).rejects.toThrow(
        "Channel info not available",
      );
    });

    it("should throw error when trying to send message without authentication", async () => {
      const client = createClient("testchannel");

      await expect(client.sendMessage("Hello")).rejects.toThrow(
        "Channel info not available",
      );
    });
  });

  describe("Input Validation Errors", () => {
    it("should pass message validation to API", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      };

      (authentication as any).mockResolvedValue({
        bearerToken: "test-token",
        xsrfToken: "test-xsrf",
        cookies: "test-cookies",
        isAuthenticated: true,
      });
      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (sendChatMessage as any).mockRejectedValue(new Error("Message too long"));

      const client = createClient("testchannel");

      await client.login({
        type: "login",
        credentials: {
          username: "testuser",
          password: "testpass",
        },
      });

      // Also login with OAuth for sendMessage
      await client.login({
        type: "oauth",
        credentials: {
          accessToken: "test-oauth-token",
        },
      });

      const longMessage = "A".repeat(501);

      await expect(client.sendMessage(longMessage)).rejects.toThrow(
        "Message too long",
      );
    });

    it("should pass empty video ID to API", async () => {
      (getVideoData as any).mockRejectedValue(new Error("Invalid video ID"));

      const client = createClient("testchannel");

      await expect(client.vod("")).rejects.toThrow("Invalid video ID");
    });
  });
});
