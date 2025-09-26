import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "./client";
import { describeWithoutTokens } from "../test-utils/testConfig";
import type { KickChannelInfo } from "../types/channels";

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
import { createWebSocket } from "../core/websocket";

describeWithoutTokens("KickClient (Mock Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should authenticate with login credentials", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      const mockAuthResult = {
        bearerToken: "test-bearer",
        xsrfToken: "test-xsrf",
        cookies: "test-cookies",
        isAuthenticated: true,
      };

      (authentication as any).mockResolvedValue(mockAuthResult);
      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue({
        on: vi.fn(),
        close: vi.fn(),
      });

      const client = createClient("testchannel");

      await client.login({
        type: "login",
        credentials: {
          username: "testuser",
          password: "testpass",
        },
      });

      expect(authentication).toHaveBeenCalledWith(
        { username: "testuser", password: "testpass" },
        "testchannel",
        undefined,
      );
      expect(getChannelData).toHaveBeenCalledWith("testchannel", undefined);
    });

    it("should authenticate with tokens", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue({
        on: vi.fn(),
        close: vi.fn(),
      });

      const client = createClient("testchannel");

      await client.login({
        type: "tokens",
        credentials: {
          bearerToken: "test-bearer",
          xsrfToken: "test-xsrf",
          cookies: "test-cookies",
        },
      });

      expect(getChannelData).toHaveBeenCalledWith("testchannel", undefined);
    });

    it("should pass puppeteer options to authentication", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      const mockAuthResult = {
        bearerToken: "test-bearer",
        xsrfToken: "test-xsrf",
        cookies: "test-cookies",
        isAuthenticated: true,
      };

      (authentication as any).mockResolvedValue(mockAuthResult);
      (getChannelData as any).mockResolvedValue(mockChannelInfo);

      const client = createClient("testchannel", {
        puppeteerOptions: { headless: true, args: ["--no-sandbox"] },
      });

      await client.login({
        type: "login",
        credentials: {
          username: "testuser",
          password: "testpass",
        },
      });

      expect(authentication).toHaveBeenCalledWith(
        { username: "testuser", password: "testpass" },
        "testchannel",
        { headless: true, args: ["--no-sandbox"] },
      );
    });
  });

  describe("VOD Functionality", () => {
    it("should fetch video data successfully", async () => {
      (getVideoData as any).mockResolvedValue({
        id: "video-123",
        livestream: {
          session_title: "Test Video",
          thumbnail: "https://example.com/thumb.jpg",
          duration: 3600,
          start_time: "2023-01-01T00:00:00.000Z",
          language: "English",
          channel: {},
        },
        source: "https://example.com/stream.m3u8",
        views: 1000,
        created_at: "2023-01-01T00:00:00.000Z",
        updated_at: "2023-01-01T00:00:00.000Z",
        uuid: "test-uuid",
        live_stream_id: 789,
      });

      const client = createClient("testchannel");
      const result = await client.vod("test-video-id");

      expect(result?.id).toBe("video-123");
      expect(result?.livestream.session_title).toBe("Test Video");
      expect(getVideoData).toHaveBeenCalledWith("test-video-id", undefined);
    });

    it("should pass puppeteer options to getVideoData", async () => {
      (getVideoData as any).mockResolvedValue({
        id: "video-123",
        livestream: { session_title: "Test Video" },
        source: "https://example.com/stream.m3u8",
      });

      const client = createClient("testchannel", {
        puppeteerOptions: { headless: true },
      });

      await client.vod("test-video-id");

      expect(getVideoData).toHaveBeenCalledWith("test-video-id", {
        headless: true,
      });
    });
  });

  describe("User Property", () => {
    it("should return null when not initialized", () => {
      const client = createClient("testchannel");
      expect(client.user).toBeNull();
    });

    it("should return user info after successful login", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      const mockAuthResult = {
        bearerToken: "test-bearer",
        xsrfToken: "test-xsrf",
        cookies: "test-cookies",
        isAuthenticated: true,
      };

      (authentication as any).mockResolvedValue(mockAuthResult);
      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue({
        on: vi.fn(),
        close: vi.fn(),
      });

      const client = createClient("testchannel");

      await client.login({
        type: "login",
        credentials: {
          username: "testuser",
          password: "testpass",
        },
      });

      expect(client.user).toEqual({
        id: 123,
        username: "testchannel",
        tag: "testuser",
      });
    });
  });
});
