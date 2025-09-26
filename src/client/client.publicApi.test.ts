import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "./client";
import { describeWithoutTokens } from "../test-utils/testConfig";
import type { KickChannelInfo } from "../types/channels";

vi.mock("../apis/private/authentication");
vi.mock("../apis/private/channelData");
vi.mock("../apis/private/videoData");
vi.mock("../apis/private/moderation");
vi.mock("../apis/public/chat");
vi.mock("../apis/public/categories");
vi.mock("../apis/public/channels");
vi.mock("../apis/public/events");
vi.mock("../apis/public/livestreams");
vi.mock("../apis/public/moderation");
vi.mock("../apis/public/publicKey");
vi.mock("../apis/public/users");
vi.mock("../utils/utils", () => ({ validateCredentials: vi.fn() }));
vi.mock("../core/websocket", () => ({
  createWebSocket: vi.fn(() => ({ on: vi.fn(), close: vi.fn() })),
}));

import { authentication } from "../apis/private/authentication";
import { getChannelData } from "../apis/private/channelData";
import { searchCategories, getCategory } from "../apis/public/categories";
import { getChannels, updateChannel } from "../apis/public/channels";
import {
  getEventSubscriptions,
  createEventSubscription,
  deleteEventSubscriptions,
} from "../apis/public/events";
import {
  getLivestreams,
  getLivestreamsStats,
} from "../apis/public/livestreams";
import { banUser, unbanUser } from "../apis/public/moderation";
import { getPublicKey } from "../apis/public/publicKey";
import { introspectToken, getUsers } from "../apis/public/users";

describeWithoutTokens("KickClient Public API Methods", () => {
  let client: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mockChannelInfo: KickChannelInfo = {
      id: 123,
      slug: "testchannel",
      chatroom: { id: 456 },
      user: { username: "testuser", id: 789 },
    } as any;

    (authentication as any).mockResolvedValue({
      bearerToken: "test-bearer",
      xsrfToken: "test-xsrf",
      cookies: "test-cookies",
      isAuthenticated: true,
    });

    (getChannelData as any).mockResolvedValue(mockChannelInfo);

    client = createClient("testchannel");
    await client.login({
      type: "tokens",
      credentials: {
        bearerToken: "test-bearer",
        xsrfToken: "test-xsrf",
        cookies: "test-cookies",
      },
    });

    // Also login with OAuth for public APIs
    await client.login({
      type: "oauth",
      credentials: {
        accessToken: "test-oauth-token",
      },
    });
  });

  describe("Categories API", () => {
    it("should call searchCategories with bearer token", async () => {
      (searchCategories as any).mockResolvedValue({ data: [] });

      await client.searchCategories("gaming", 1);

      expect(searchCategories).toHaveBeenCalledWith(
        "test-oauth-token",
        "gaming",
        1,
      );
    });

    it("should call getCategory with bearer token", async () => {
      (getCategory as any).mockResolvedValue({ data: {} });

      await client.getCategory(123);

      expect(getCategory).toHaveBeenCalledWith("test-oauth-token", 123);
    });
  });

  describe("Channels API", () => {
    it("should call getChannels with bearer token and options", async () => {
      (getChannels as any).mockResolvedValue({ data: [] });

      const options = { slug: ["channel1"] };
      await client.getChannels(options);

      expect(getChannels).toHaveBeenCalledWith("test-oauth-token", options);
    });

    it("should call updateChannel with bearer token and options", async () => {
      (updateChannel as any).mockResolvedValue({ success: true });

      const options = { stream_title: "New Title" };
      await client.updateChannel(options);

      expect(updateChannel).toHaveBeenCalledWith("test-oauth-token", options);
    });
  });

  describe("Events API", () => {
    it("should call getEventSubscriptions with bearer token", async () => {
      (getEventSubscriptions as any).mockResolvedValue({ data: [] });

      await client.getEventSubscriptions();

      expect(getEventSubscriptions).toHaveBeenCalledWith("test-oauth-token");
    });

    it("should call createEventSubscription with bearer token and data", async () => {
      (createEventSubscription as any).mockResolvedValue({ data: {} });

      const data = { events: ["chat:message"], method: "webhook" };
      await client.createEventSubscription(data);

      expect(createEventSubscription).toHaveBeenCalledWith(
        "test-oauth-token",
        data,
      );
    });

    it("should call deleteEventSubscriptions with bearer token and IDs", async () => {
      (deleteEventSubscriptions as any).mockResolvedValue(undefined);

      await client.deleteEventSubscriptions(["123", "456"]);

      expect(deleteEventSubscriptions).toHaveBeenCalledWith(
        "test-oauth-token",
        ["123", "456"],
      );
    });
  });

  describe("Livestreams API", () => {
    it("should call getLivestreams with bearer token and options", async () => {
      (getLivestreams as any).mockResolvedValue({ data: [] });

      const options = { category_id: 10 };
      await client.getLivestreams(options);

      expect(getLivestreams).toHaveBeenCalledWith("test-oauth-token", options);
    });

    it("should call getLivestreamsStats with bearer token", async () => {
      (getLivestreamsStats as any).mockResolvedValue({ data: {} });

      await client.getLivestreamsStats();

      expect(getLivestreamsStats).toHaveBeenCalledWith("test-oauth-token");
    });
  });

  describe("Moderation API", () => {
    it("should call banUserPublic with bearer token and parameters", async () => {
      (banUser as any).mockResolvedValue({ success: true });

      await client.banUserPublic(100, 200, 60, "spam");

      expect(banUser).toHaveBeenCalledWith(
        "test-oauth-token",
        100,
        200,
        60,
        "spam",
      );
    });

    it("should call unbanUserPublic with bearer token and parameters", async () => {
      (unbanUser as any).mockResolvedValue({ success: true });

      await client.unbanUserPublic(100, 200);

      expect(unbanUser).toHaveBeenCalledWith("test-oauth-token", 100, 200);
    });
  });

  describe("Other Public APIs", () => {
    it("should call getPublicKey without authentication", async () => {
      (getPublicKey as any).mockResolvedValue({ data: { public_key: "key" } });

      await client.getPublicKey();

      expect(getPublicKey).toHaveBeenCalled();
    });

    it("should call introspectToken with bearer token", async () => {
      (introspectToken as any).mockResolvedValue({ data: {} });

      await client.introspectToken();

      expect(introspectToken).toHaveBeenCalledWith("test-oauth-token");
    });

    it("should call getUsers with bearer token and user IDs", async () => {
      (getUsers as any).mockResolvedValue({ data: [] });

      await client.getUsers([100, 200]);

      expect(getUsers).toHaveBeenCalledWith("test-oauth-token", [100, 200]);
    });
  });

  describe("Authentication checks", () => {
    it("should throw error when calling searchCategories without authentication", async () => {
      const unauthClient = createClient("testchannel");
      await expect(unauthClient.searchCategories("gaming")).rejects.toThrow(
        "Public API authentication required. Please login with OAuth first.",
      );
    });

    it("should throw error when calling getChannels without authentication", async () => {
      const unauthClient = createClient("testchannel");
      await expect(unauthClient.getChannels()).rejects.toThrow(
        "Public API authentication required. Please login with OAuth first.",
      );
    });

    it("should throw error when calling getLivestreams without authentication", async () => {
      const unauthClient = createClient("testchannel");
      await expect(unauthClient.getLivestreams()).rejects.toThrow(
        "Public API authentication required. Please login with OAuth first.",
      );
    });
  });
});
