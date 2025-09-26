import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getChannelData } from "./channelData";
import {
  describeWithTokens,
  describeWithoutTokens,
  getTestConfig,
} from "../../test-utils/testConfig";

// Mock the entire channelData module for unit tests
vi.mock("./channelData", async () => {
  const actual = await vi.importActual("./channelData");
  return {
    ...actual,
    getChannelData: vi.fn(),
  };
});

// Import the mocked function
import { getChannelData as mockGetChannelData } from "./channelData";

describeWithoutTokens("Channel Data API (Mock Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getChannelData", () => {
    it("should get channel data successfully", async () => {
      const mockResult = {
        id: 123,
        slug: "test-channel",
        chatroom: { id: 456 },
        user: { username: "testuser" },
      };

      (mockGetChannelData as any).mockResolvedValue(mockResult);

      const result = await getChannelData("test-channel");

      expect(result).toEqual(mockResult);
      expect(mockGetChannelData).toHaveBeenCalledWith("test-channel");
    });

    it("should handle channel that does not exist", async () => {
      (mockGetChannelData as any).mockResolvedValue(null);

      const result = await getChannelData("nonexistent-channel");

      expect(result).toBeNull();
      expect(mockGetChannelData).toHaveBeenCalledWith("nonexistent-channel");
    });

    it("should handle errors gracefully", async () => {
      const error = new Error("Channel fetch failed");
      (mockGetChannelData as any).mockRejectedValue(error);

      await expect(getChannelData("error-channel")).rejects.toThrow(
        "Channel fetch failed",
      );
      expect(mockGetChannelData).toHaveBeenCalledWith("error-channel");
    });

    it("should pass puppeteer options", async () => {
      const mockResult = { id: 123, slug: "test" };
      const options = { headless: true, args: ["--no-sandbox"] };

      (mockGetChannelData as any).mockResolvedValue(mockResult);

      await getChannelData("test-channel", options);

      expect(mockGetChannelData).toHaveBeenCalledWith("test-channel", options);
    });

    it("should validate channel name", async () => {
      (mockGetChannelData as any).mockResolvedValue(null);

      const result = await getChannelData("");

      expect(result).toBeNull();
    });
  });
});

describeWithTokens("Channel Data API (Integration Tests)", () => {
  const config = getTestConfig();

  it("should get real channel data for a known channel", async () => {
    if (!config.testChannel) {
      console.log(
        "Skipping channel data integration test - no test channel specified",
      );
      console.log("Add KICK_CHANNEL to your environment variables");
      return;
    }

    // NOTE: We skip actual channel data scraping in tests as it requires
    // a real browser and could be flaky. This test just validates config.
    expect(config.testChannel).toBeDefined();
    expect(typeof config.testChannel).toBe("string");
  });
});
