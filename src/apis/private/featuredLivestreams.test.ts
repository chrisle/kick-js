import { it, expect } from "vitest";
import { getFeaturedLivestreams } from "./featuredLivestreams";
import { describeWithTokens } from "../../test-utils/testConfig";

describeWithTokens("Featured Livestreams API (Integration Tests)", () => {
  it("should get real featured livestreams data", async () => {
    const result = await getFeaturedLivestreams({ language: "en" });

    expect(result).toBeDefined();
    expect(result).not.toBeNull();

    if (result) {
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("message");
      expect(result.data).toHaveProperty("livestreams");
      expect(Array.isArray(result.data.livestreams)).toBe(true);

      if (result.data.livestreams.length > 0) {
        const firstStream = result.data.livestreams[0];
        expect(firstStream).toHaveProperty("id");
        expect(firstStream).toHaveProperty("title");
        expect(firstStream).toHaveProperty("viewer_count");
        expect(firstStream).toHaveProperty("channel");
        expect(firstStream).toHaveProperty("category");
        expect(firstStream).toHaveProperty("language");
      }
    }
  }, 30000);

  it("should handle different language codes", async () => {
    const result = await getFeaturedLivestreams({ language: "es" });
    expect(result).toBeDefined();
  }, 30000);

  it("should handle multiple language codes", async () => {
    const result = await getFeaturedLivestreams({ language: "sq,ar" });
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
  }, 30000);

  it("should handle sort parameter", async () => {
    const result = await getFeaturedLivestreams({
      language: "en",
      sort: "viewers_high_to_low",
    });
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
  }, 30000);
});