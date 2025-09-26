import { describe, it, expect, vi } from "vitest";
import { parseMessage } from "./messageHandling";

describe("parseMessage", () => {
  it("should parse ChatMessageEvent", () => {
    const message = JSON.stringify({
      event: "App\\Events\\ChatMessageEvent",
      data: JSON.stringify({
        id: "123",
        content: "Hello world",
        sender: { username: "testuser" },
      }),
    });

    const result = parseMessage(message);

    expect(result).toEqual({
      type: "ChatMessage",
      data: {
        id: "123",
        content: "Hello world",
        sender: { username: "testuser" },
      },
    });
  });

  it("should parse SubscriptionEvent", () => {
    const message = JSON.stringify({
      event: "App\\Events\\SubscriptionEvent",
      data: JSON.stringify({
        username: "subscriber",
        months: 1,
      }),
    });

    const result = parseMessage(message);

    expect(result).toEqual({
      type: "Subscription",
      data: {
        username: "subscriber",
        months: 1,
      },
    });
  });

  it("should parse GiftedSubscriptionsEvent", () => {
    const message = JSON.stringify({
      event: "App\\Events\\GiftedSubscriptionsEvent",
      data: JSON.stringify({
        gifter_username: "gifter",
        gifted_usernames: ["user1", "user2"],
      }),
    });

    const result = parseMessage(message);

    expect(result).toEqual({
      type: "GiftedSubscriptions",
      data: {
        gifter_username: "gifter",
        gifted_usernames: ["user1", "user2"],
      },
    });
  });

  it("should parse StreamHostEvent", () => {
    const message = JSON.stringify({
      event: "App\\Events\\StreamHostEvent",
      data: JSON.stringify({
        host_username: "host",
        number_viewers: 100,
      }),
    });

    const result = parseMessage(message);

    expect(result).toEqual({
      type: "StreamHost",
      data: {
        host_username: "host",
        number_viewers: 100,
      },
    });
  });

  it("should parse MessageDeletedEvent", () => {
    const message = JSON.stringify({
      event: "App\\Events\\MessageDeletedEvent",
      data: JSON.stringify({
        id: "456",
        message: { content: "deleted" },
      }),
    });

    const result = parseMessage(message);

    expect(result).toEqual({
      type: "MessageDeleted",
      data: {
        id: "456",
        message: { content: "deleted" },
      },
    });
  });

  it("should parse UserBannedEvent", () => {
    const message = JSON.stringify({
      event: "App\\Events\\UserBannedEvent",
      data: JSON.stringify({
        user: { username: "banneduser" },
        banned_by: { username: "moderator" },
      }),
    });

    const result = parseMessage(message);

    expect(result).toEqual({
      type: "UserBanned",
      data: {
        user: { username: "banneduser" },
        banned_by: { username: "moderator" },
      },
    });
  });

  it("should parse UserUnbannedEvent", () => {
    const message = JSON.stringify({
      event: "App\\Events\\UserUnbannedEvent",
      data: JSON.stringify({
        user: { username: "unbanneduser" },
        unbanned_by: { username: "moderator" },
      }),
    });

    const result = parseMessage(message);

    expect(result).toEqual({
      type: "UserUnbanned",
      data: {
        user: { username: "unbanneduser" },
        unbanned_by: { username: "moderator" },
      },
    });
  });

  it("should parse PinnedMessageCreatedEvent", () => {
    const message = JSON.stringify({
      event: "App\\Events\\PinnedMessageCreatedEvent",
      data: JSON.stringify({
        message: { id: "789", content: "pinned" },
      }),
    });

    const result = parseMessage(message);

    expect(result).toEqual({
      type: "PinnedMessageCreated",
      data: {
        message: { id: "789", content: "pinned" },
      },
    });
  });

  it("should parse PinnedMessageDeletedEvent", () => {
    const message = JSON.stringify({
      event: "App\\Events\\PinnedMessageDeletedEvent",
      data: JSON.stringify({
        message: { id: "789", content: "unpinned" },
      }),
    });

    const result = parseMessage(message);

    expect(result).toEqual({
      type: "PinnedMessageDeleted",
      data: {
        message: { id: "789", content: "unpinned" },
      },
    });
  });

  it("should parse PollUpdateEvent", () => {
    const message = JSON.stringify({
      event: "App\\Events\\PollUpdateEvent",
      data: JSON.stringify({
        poll_id: "123",
        options: [],
      }),
    });

    const result = parseMessage(message);

    expect(result).toEqual({
      type: "PollUpdate",
      data: {
        poll_id: "123",
        options: [],
      },
    });
  });

  it("should parse PollDeleteEvent", () => {
    const message = JSON.stringify({
      event: "App\\Events\\PollDeleteEvent",
      data: JSON.stringify({
        poll_id: "456",
      }),
    });

    const result = parseMessage(message);

    expect(result).toEqual({
      type: "PollDelete",
      data: {
        poll_id: "456",
      },
    });
  });

  it("should return null for unknown event type", () => {
    const consoleDebugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    const message = JSON.stringify({
      event: "App\\Events\\UnknownEvent",
      data: "{}",
    });

    const result = parseMessage(message);

    expect(result).toBeNull();
    expect(consoleDebugSpy).toHaveBeenCalledWith(
      "Unknown event type:",
      "App\\Events\\UnknownEvent",
    );

    consoleDebugSpy.mockRestore();
  });

  it("should return null for invalid JSON", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const message = "invalid json";

    const result = parseMessage(message);

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should return null when parsing fails", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const message = JSON.stringify({
      event: "App\\Events\\ChatMessageEvent",
      data: "invalid nested json",
    });

    const result = parseMessage(message);

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
