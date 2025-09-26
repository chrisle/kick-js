import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { deleteMessage, setSlowMode } from "./moderation";
import {
  describeWithTokens,
  describeWithoutTokens,
  getTestConfig,
} from "../../test-utils/testConfig";

// Mock fetch globally
global.fetch = vi.fn();

describeWithoutTokens("Private Moderation API (Mock Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("deleteMessage", () => {
    it("should delete a message successfully", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      const result = await deleteMessage(
        123,
        "msg-456",
        "test-bearer-token",
        "test-xsrf-token",
        "test-cookies",
      );

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://kick.com/api/v2/chatrooms/123/messages/msg-456",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            Authorization: "Bearer test-bearer-token",
            "X-XSRF-TOKEN": "test-xsrf-token",
            Accept: "application/json",
            Cookie: "test-cookies",
          }),
        }),
      );
    });

    it("should handle API errors", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403,
        text: vi.fn().mockResolvedValue("Forbidden"),
      });

      await expect(
        deleteMessage(
          123,
          "msg-456",
          "invalid-token",
          "invalid-xsrf",
          "invalid-cookies",
        ),
      ).rejects.toThrow("Delete message failed: 403");
    });

    it("should validate required parameters", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue("Bad Request"),
      });

      // These should trigger fetch calls that fail with 400 - the validation is done by the server
      await expect(
        deleteMessage(123, "msg-123", "", "xsrf", "cookies"),
      ).rejects.toThrow("Delete message failed: 400");
    });
  });

  describe("setSlowMode", () => {
    it("should enable slow mode successfully", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      const result = await setSlowMode(
        "test-channel",
        true,
        "test-bearer-token",
        "test-xsrf-token",
        "test-cookies",
        30,
      );

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://kick.com/api/v1/channels/test-channel/chatroom/settings",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            Authorization: "Bearer test-bearer-token",
            "X-XSRF-TOKEN": "test-xsrf-token",
            "Content-Type": "application/json",
            Accept: "application/json",
            Cookie: "test-cookies",
            Referer: "https://kick.com/test-channel",
          }),
          body: JSON.stringify({ slow_mode: true, message_interval: 30 }),
        }),
      );
    });

    it("should disable slow mode successfully", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      const result = await setSlowMode(
        "test-channel",
        false,
        "test-bearer-token",
        "test-xsrf-token",
        "test-cookies",
      );

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://kick.com/api/v1/channels/test-channel/chatroom/settings",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ slow_mode: false }),
        }),
      );
    });

    it("should handle API errors", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue("Unauthorized"),
      });

      await expect(
        setSlowMode(
          "test-channel",
          true,
          "invalid-token",
          "invalid-xsrf",
          "invalid-cookies",
        ),
      ).rejects.toThrow("Slow mode update failed: 401");
    });

    it("should validate required parameters", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue("Bad Request"),
      });

      // These should trigger fetch calls that fail with 400 - the validation is done by the server
      await expect(
        setSlowMode("channel", true, "", "xsrf", "cookies"),
      ).rejects.toThrow("Slow mode update failed: 400");
    });

    it("should handle custom duration for slow mode", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      await setSlowMode("test-channel", true, "token", "xsrf", "cookies", 60);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://kick.com/api/v1/channels/test-channel/chatroom/settings",
        expect.objectContaining({
          body: JSON.stringify({ slow_mode: true, message_interval: 60 }),
        }),
      );
    });
  });
});

describeWithTokens("Private Moderation API (Integration Tests)", () => {
  const config = getTestConfig();

  it("should validate credentials for private moderation", () => {
    if (!config.tokenCredentials?.bearerToken) {
      console.log(
        "Skipping private moderation integration test - no credentials available",
      );
      console.log(
        'Run "pnpm run getOauthTokens" first to get OAuth credentials',
      );
      return;
    }

    // NOTE: We don't actually perform moderation actions in tests as that would
    // require special permissions and could affect real chat rooms
    expect(config.tokenCredentials.bearerToken).toBeDefined();
  });
});
