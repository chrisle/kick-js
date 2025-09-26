import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { createHeaders, makeRequest } from "./requestHelper";

vi.mock("axios");

describe("createHeaders", () => {
  it("should create headers with all required fields", () => {
    const config = {
      bearerToken: "test-token",
      xsrfToken: "test-xsrf",
      cookies: "session=abc123",
      channelSlug: "testchannel",
    };

    const headers = createHeaders(config);

    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("accept-language")).toBe("en-US,en;q=0.9");
    expect(headers.get("authorization")).toBe("Bearer test-token");
    expect(headers.get("cache-control")).toBe("max-age=0");
    expect(headers.get("cluster")).toBe("v2");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("priority")).toBe("u=1, i");
    expect(headers.get("cookie")).toBe("session=abc123");
    expect(headers.get("Referer")).toBe("https://kick.com/testchannel");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("should handle different channel slugs", () => {
    const config = {
      bearerToken: "token",
      xsrfToken: "xsrf",
      cookies: "cookie",
      channelSlug: "anotherchannel",
    };

    const headers = createHeaders(config);

    expect(headers.get("Referer")).toBe("https://kick.com/anotherchannel");
  });

  it("should handle empty cookies", () => {
    const config = {
      bearerToken: "token",
      xsrfToken: "xsrf",
      cookies: "",
      channelSlug: "channel",
    };

    const headers = createHeaders(config);

    expect(headers.get("cookie")).toBe("");
  });
});

describe("makeRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should make successful GET request", async () => {
    const mockData = { success: true, data: "test" };
    (axios as any).mockResolvedValue({
      status: 200,
      data: mockData,
    });

    const headers = createHeaders({
      bearerToken: "token",
      xsrfToken: "xsrf",
      cookies: "cookie",
      channelSlug: "channel",
    });

    const result = await makeRequest(
      "get",
      "https://api.kick.com/test",
      headers,
    );

    expect(result).toEqual(mockData);
    expect(axios).toHaveBeenCalledWith({
      method: "get",
      url: "https://api.kick.com/test",
      headers,
      data: undefined,
    });
  });

  it("should make successful POST request with data", async () => {
    const mockData = { success: true };
    const postData = { message: "Hello" };

    (axios as any).mockResolvedValue({
      status: 200,
      data: mockData,
    });

    const headers = createHeaders({
      bearerToken: "token",
      xsrfToken: "xsrf",
      cookies: "cookie",
      channelSlug: "channel",
    });

    const result = await makeRequest(
      "post",
      "https://api.kick.com/messages",
      headers,
      postData,
    );

    expect(result).toEqual(mockData);
    expect(axios).toHaveBeenCalledWith({
      method: "post",
      url: "https://api.kick.com/messages",
      headers,
      data: postData,
    });
  });

  it("should handle non-200 status codes", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    (axios as any).mockResolvedValue({
      status: 404,
      data: null,
    });

    const headers = createHeaders({
      bearerToken: "token",
      xsrfToken: "xsrf",
      cookies: "cookie",
      channelSlug: "channel",
    });

    const result = await makeRequest(
      "get",
      "https://api.kick.com/notfound",
      headers,
    );

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Request failed with status: 404",
    );

    consoleErrorSpy.mockRestore();
  });

  it("should handle request errors", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const error = new Error("Network error");

    (axios as any).mockRejectedValue(error);

    const headers = createHeaders({
      bearerToken: "token",
      xsrfToken: "xsrf",
      cookies: "cookie",
      channelSlug: "channel",
    });

    const result = await makeRequest(
      "get",
      "https://api.kick.com/error",
      headers,
    );

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Request error for https://api.kick.com/error:",
      error,
    );

    consoleErrorSpy.mockRestore();
  });

  it("should support PUT method", async () => {
    const mockData = { updated: true };
    (axios as any).mockResolvedValue({
      status: 200,
      data: mockData,
    });

    const headers = createHeaders({
      bearerToken: "token",
      xsrfToken: "xsrf",
      cookies: "cookie",
      channelSlug: "channel",
    });

    const result = await makeRequest(
      "put",
      "https://api.kick.com/update",
      headers,
      { id: 1 },
    );

    expect(result).toEqual(mockData);
  });

  it("should support DELETE method", async () => {
    const mockData = { deleted: true };
    (axios as any).mockResolvedValue({
      status: 200,
      data: mockData,
    });

    const headers = createHeaders({
      bearerToken: "token",
      xsrfToken: "xsrf",
      cookies: "cookie",
      channelSlug: "channel",
    });

    const result = await makeRequest(
      "delete",
      "https://api.kick.com/delete/123",
      headers,
    );

    expect(result).toEqual(mockData);
  });
});
