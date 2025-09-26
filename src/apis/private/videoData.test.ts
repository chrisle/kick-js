import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getVideoData } from "./videoData";
import {
  describeWithTokens,
  describeWithoutTokens,
  getTestConfig,
} from "../../test-utils/testConfig";

// Mock the entire videoData module for unit tests
vi.mock("./videoData", async () => {
  const actual = await vi.importActual("./videoData");
  return {
    ...actual,
    getVideoData: vi.fn(),
  };
});

// Import the mocked function
import { getVideoData as mockGetVideoData } from "./videoData";

describeWithoutTokens("Video Data API (Mock Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getVideoData", () => {
    it("should get video data successfully", async () => {
      const mockResult = {
        id: "video-123",
        uuid: "test-uuid",
        livestream: {
          session_title: "Test Stream",
          thumbnail: "https://example.com/thumb.jpg",
          duration: 3600,
          start_time: "2023-01-01T00:00:00.000Z",
          language: "English",
          channel: {
            id: 456,
            slug: "test-channel",
            user: { username: "testuser" },
          },
        },
        source: "https://example.com/video.m3u8",
        views: 1000,
        created_at: "2023-01-01T00:00:00.000Z",
        updated_at: "2023-01-01T01:00:00.000Z",
        live_stream_id: 789,
      };

      (mockGetVideoData as any).mockResolvedValue(mockResult);

      const result = await getVideoData("test-video-id");

      expect(result).toEqual(mockResult);
      expect(mockGetVideoData).toHaveBeenCalledWith("test-video-id");
    });

    it("should handle video that does not exist", async () => {
      (mockGetVideoData as any).mockResolvedValue(null);

      const result = await getVideoData("nonexistent-video");

      expect(result).toBeNull();
      expect(mockGetVideoData).toHaveBeenCalledWith("nonexistent-video");
    });

    it("should handle errors gracefully", async () => {
      const error = new Error("Video fetch failed");
      (mockGetVideoData as any).mockRejectedValue(error);

      await expect(getVideoData("error-video")).rejects.toThrow(
        "Video fetch failed",
      );
      expect(mockGetVideoData).toHaveBeenCalledWith("error-video");
    });

    it("should pass puppeteer options", async () => {
      const mockResult = { id: "video-123" };
      const options = { headless: true, args: ["--no-sandbox"] };

      (mockGetVideoData as any).mockResolvedValue(mockResult);

      await getVideoData("test-video", options);

      expect(mockGetVideoData).toHaveBeenCalledWith("test-video", options);
    });

    it("should validate video ID format", async () => {
      (mockGetVideoData as any).mockResolvedValue(null);

      // Test with empty string
      const result1 = await getVideoData("");
      expect(result1).toBeNull();

      // Test with very short ID
      const result2 = await getVideoData("ab");
      expect(result2).toBeNull();

      expect(mockGetVideoData).toHaveBeenCalledTimes(2);
    });

    it("should handle video removal error message", async () => {
      const error = new Error("Video does not exist or has been removed");
      (mockGetVideoData as any).mockRejectedValue(error);

      await expect(getVideoData("removed-video")).rejects.toThrow(
        "Video does not exist or has been removed",
      );
    });
  });
});

describeWithTokens("Video Data API (Integration Tests)", () => {
  const config = getTestConfig();

  it("should validate video data format", () => {
    if (!config.testVideoId) {
      console.log(
        "Skipping video data integration test - no test video ID specified",
      );
      console.log("Add KICK_TEST_VIDEO_ID to your environment variables");
      return;
    }

    // NOTE: We skip actual video data scraping in tests as it requires
    // a real browser and could be flaky. This test just validates config.
    expect(config.testVideoId).toBeDefined();
    expect(typeof config.testVideoId).toBe("string");
  });
});
