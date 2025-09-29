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

vi.mock("../apis/public/users", () => ({
  introspectToken: vi.fn(),
  getUsers: vi.fn(),
}));

vi.mock("../apis/public/categories", () => ({
  searchCategories: vi.fn(),
  getCategory: vi.fn(),
}));

// Mock validation utility
vi.mock("../utils/utils", () => ({
  validateCredentials: vi.fn(),
}));

// Mock token refresh utilities
vi.mock("../utils/tokenRefresh", () => ({
  refreshOAuthToken: vi.fn(),
  updateEnvTokens: vi.fn(),
  shouldRefreshToken: vi.fn(),
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
import {
  refreshOAuthToken,
  updateEnvTokens,
  shouldRefreshToken,
} from "../utils/tokenRefresh";
import {
  introspectToken as mockIntrospectToken,
  getUsers,
} from "../apis/public/users";
import { searchCategories } from "../apis/public/categories";

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

  describe("Disconnect", () => {
    it("should close WebSocket and remove all listeners", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      const mockWebSocket = {
        on: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      };

      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue(mockWebSocket);

      const client = createClient("testchannel");

      await client.login({
        type: "tokens",
        credentials: {
          bearerToken: "test-bearer",
          xsrfToken: "test-xsrf",
          cookies: "test-cookies",
        },
      });

      const readyListener = vi.fn();
      const chatListener = vi.fn();
      const testEventListener = vi.fn();

      client.on("ready", readyListener);
      client.on("ChatMessage", chatListener);
      client.on("testEvent", testEventListener);

      const countBefore = client.listenerCount("testEvent");
      expect(countBefore).toBe(1);

      client.disconnect();

      expect(mockWebSocket.close).toHaveBeenCalled();
      expect(client.listenerCount("testEvent")).toBe(0);
      expect(client.listenerCount("ChatMessage")).toBe(0);
    });

    it("should handle disconnect when WebSocket is null", () => {
      const client = createClient("testchannel");

      expect(() => client.disconnect()).not.toThrow();
    });

    it("should handle WebSocket close errors gracefully", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      const mockWebSocket = {
        on: vi.fn(),
        close: vi.fn(() => {
          throw new Error("Close failed");
        }),
        readyState: 1,
      };

      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue(mockWebSocket);

      const client = createClient("testchannel", { logger: false });

      await client.login({
        type: "tokens",
        credentials: {
          bearerToken: "test-bearer",
          xsrfToken: "test-xsrf",
          cookies: "test-cookies",
        },
      });

      expect(() => client.disconnect()).not.toThrow();
    });

    it("should not call close when WebSocket is already closed", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      const mockWebSocket = {
        on: vi.fn(),
        close: vi.fn(),
        readyState: 3,
      };

      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue(mockWebSocket);

      const client = createClient("testchannel");

      await client.login({
        type: "tokens",
        credentials: {
          bearerToken: "test-bearer",
          xsrfToken: "test-xsrf",
          cookies: "test-cookies",
        },
      });

      client.disconnect();

      expect(mockWebSocket.close).not.toHaveBeenCalled();
      expect(client.listenerCount("ChatMessage")).toBe(0);
    });
  });

  describe("Token Refresh Callback", () => {
    beforeEach(() => {
      process.env.KICK_ACCESS_TOKEN = "initial-token";
      process.env.KICK_CLIENT_ID = "test-client-id";
      process.env.KICK_CLIENT_SECRET = "test-client-secret";
      process.env.KICK_REFRESH_TOKEN = "test-refresh-token";
      process.env.KICK_EXPIRES_IN = "3600";
      process.env.KICK_TOKEN_UPDATED = new Date(
        Date.now() - 7200000,
      ).toISOString();
    });

    afterEach(() => {
      delete process.env.KICK_ACCESS_TOKEN;
      delete process.env.KICK_CLIENT_ID;
      delete process.env.KICK_CLIENT_SECRET;
      delete process.env.KICK_REFRESH_TOKEN;
      delete process.env.KICK_EXPIRES_IN;
      delete process.env.KICK_TOKEN_UPDATED;
    });

    it("should call onTokenRefresh callback when token is refreshed", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      const mockNewTokens = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
      };

      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue({
        on: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      });
      (shouldRefreshToken as any).mockReturnValue(true);
      (refreshOAuthToken as any).mockResolvedValue(mockNewTokens);
      (mockIntrospectToken as any).mockResolvedValue({
        active: true,
        client_id: "test-client-id",
      });

      const onTokenRefreshCallback = vi.fn();

      const client = createClient("testchannel", {
        onTokenRefresh: onTokenRefreshCallback,
      });

      await client.login({ type: "oauth" });

      await client.introspectToken();

      expect(shouldRefreshToken).toHaveBeenCalled();
      expect(refreshOAuthToken).toHaveBeenCalledWith(
        "test-client-id",
        "test-client-secret",
        "test-refresh-token",
      );
      expect(onTokenRefreshCallback).toHaveBeenCalledWith(mockNewTokens);
      expect(updateEnvTokens).not.toHaveBeenCalled();
    });

    it("should use updateEnvTokens as fallback when no callback provided", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      const mockNewTokens = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
      };

      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue({
        on: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      });
      (shouldRefreshToken as any).mockReturnValue(true);
      (refreshOAuthToken as any).mockResolvedValue(mockNewTokens);
      (mockIntrospectToken as any).mockResolvedValue({
        active: true,
        client_id: "test-client-id",
      });

      const client = createClient("testchannel");

      await client.login({ type: "oauth" });

      await client.introspectToken();

      expect(refreshOAuthToken).toHaveBeenCalled();
      expect(updateEnvTokens).toHaveBeenCalledWith(mockNewTokens);
    });

    it("should handle callback errors gracefully", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      const mockNewTokens = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
      };

      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue({
        on: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      });
      (shouldRefreshToken as any).mockReturnValue(true);
      (refreshOAuthToken as any).mockResolvedValue(mockNewTokens);
      (mockIntrospectToken as any).mockResolvedValue({
        active: true,
        client_id: "test-client-id",
      });

      const failingCallback = vi.fn(() => {
        throw new Error("Callback failed");
      });

      const client = createClient("testchannel", {
        onTokenRefresh: failingCallback,
        logger: false,
      });

      await client.login({ type: "oauth" });

      await expect(client.introspectToken()).resolves.not.toThrow();

      expect(failingCallback).toHaveBeenCalledWith(mockNewTokens);
    });

    it("should handle async callback", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      const mockNewTokens = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
      };

      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue({
        on: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      });
      (shouldRefreshToken as any).mockReturnValue(true);
      (refreshOAuthToken as any).mockResolvedValue(mockNewTokens);
      (mockIntrospectToken as any).mockResolvedValue({
        active: true,
        client_id: "test-client-id",
      });

      const asyncCallback = vi.fn(async (tokens) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return tokens;
      });

      const client = createClient("testchannel", {
        onTokenRefresh: asyncCallback,
      });

      await client.login({ type: "oauth" });

      await client.introspectToken();

      expect(asyncCallback).toHaveBeenCalledWith(mockNewTokens);
      expect(updateEnvTokens).not.toHaveBeenCalled();
    });
  });

  describe("401 Error Handling and Retry", () => {
    beforeEach(() => {
      process.env.KICK_ACCESS_TOKEN = "expired-token";
      process.env.KICK_CLIENT_ID = "test-client-id";
      process.env.KICK_CLIENT_SECRET = "test-client-secret";
      process.env.KICK_REFRESH_TOKEN = "test-refresh-token";
      process.env.KICK_EXPIRES_IN = "3600";
      process.env.KICK_TOKEN_UPDATED = new Date(Date.now()).toISOString();
    });

    afterEach(() => {
      delete process.env.KICK_ACCESS_TOKEN;
      delete process.env.KICK_CLIENT_ID;
      delete process.env.KICK_CLIENT_SECRET;
      delete process.env.KICK_REFRESH_TOKEN;
      delete process.env.KICK_EXPIRES_IN;
      delete process.env.KICK_TOKEN_UPDATED;
    });

    it("should refresh token and retry on 401 error", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      const mockNewTokens = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
      };

      const mockSuccessResponse = {
        active: true,
        client_id: "test-client-id",
      };

      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue({
        on: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      });
      (shouldRefreshToken as any).mockReturnValue(false);
      (refreshOAuthToken as any).mockResolvedValue(mockNewTokens);

      let callCount = 0;
      (mockIntrospectToken as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Token introspect failed: 401");
        }
        return Promise.resolve(mockSuccessResponse);
      });

      const client = createClient("testchannel", { logger: false });

      await client.login({ type: "oauth" });

      const result = await client.introspectToken();

      expect(mockIntrospectToken).toHaveBeenCalledTimes(2);
      expect(refreshOAuthToken).toHaveBeenCalledWith(
        "test-client-id",
        "test-client-secret",
        "test-refresh-token",
      );
      expect(result).toEqual(mockSuccessResponse);
    });

    it("should handle 401 with 'unauthorized' text", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      const mockNewTokens = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
      };

      const mockUsers = {
        data: [{ user_id: 1, name: "testuser" }],
        message: "Success",
      };

      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue({
        on: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      });
      (shouldRefreshToken as any).mockReturnValue(false);
      (refreshOAuthToken as any).mockResolvedValue(mockNewTokens);

      let callCount = 0;
      vi.mocked(getUsers).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Request unauthorized");
        }
        return Promise.resolve(mockUsers);
      });

      const client = createClient("testchannel", { logger: false });

      await client.login({ type: "oauth" });

      const result = await client.getUsers([1]);

      expect(getUsers).toHaveBeenCalledTimes(2);
      expect(refreshOAuthToken).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });

    it("should fail if refresh credentials unavailable on 401", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      delete process.env.KICK_CLIENT_ID;

      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue({
        on: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      });
      (shouldRefreshToken as any).mockReturnValue(false);
      (mockIntrospectToken as any).mockRejectedValue(
        new Error("Token introspect failed: 401"),
      );

      const client = createClient("testchannel", { logger: false });

      await client.login({ type: "oauth" });

      await expect(client.introspectToken()).rejects.toThrow(
        "Cannot refresh token: OAuth credentials not available",
      );
    });

    it("should call onTokenRefresh callback on 401 retry", async () => {
      const mockChannelInfo = {
        id: 123,
        slug: "testchannel",
        chatroom: { id: 456 },
        user: { username: "testuser", id: 789 },
      } as KickChannelInfo;

      const mockNewTokens = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
      };

      const mockCategories = {
        data: [{ id: 1, name: "Gaming" }],
        message: "Success",
      };

      (getChannelData as any).mockResolvedValue(mockChannelInfo);
      (createWebSocket as any).mockReturnValue({
        on: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      });
      (shouldRefreshToken as any).mockReturnValue(false);
      (refreshOAuthToken as any).mockResolvedValue(mockNewTokens);

      const onTokenRefreshCallback = vi.fn();

      let callCount = 0;
      vi.mocked(searchCategories).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Search categories failed: 401");
        }
        return Promise.resolve(mockCategories);
      });

      const client = createClient("testchannel", {
        onTokenRefresh: onTokenRefreshCallback,
        logger: false,
      });

      await client.login({ type: "oauth" });

      const result = await client.searchCategories("test");

      expect(searchCategories).toHaveBeenCalledTimes(2);
      expect(onTokenRefreshCallback).toHaveBeenCalledWith(mockNewTokens);
      expect(updateEnvTokens).not.toHaveBeenCalled();
      expect(result).toEqual(mockCategories);
    });

    it("should throw if refresh fails on 401", async () => {
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
        readyState: 1,
      });
      (shouldRefreshToken as any).mockReturnValue(false);
      (refreshOAuthToken as any).mockRejectedValue(
        new Error("Refresh token expired"),
      );
      (mockIntrospectToken as any).mockRejectedValue(
        new Error("Token introspect failed: 401"),
      );

      const client = createClient("testchannel", { logger: false });

      await client.login({ type: "oauth" });

      await expect(client.introspectToken()).rejects.toThrow(
        "Failed to refresh token after 401",
      );
    });
  });
});
