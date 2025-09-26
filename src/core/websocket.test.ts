import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { createWebSocket } from "./websocket";

vi.mock("ws");

describe("createWebSocket", () => {
  let mockSocket: any;
  let onHandlers: Map<string, Function>;

  beforeEach(() => {
    onHandlers = new Map();

    mockSocket = {
      on: vi.fn((event: string, handler: Function) => {
        onHandlers.set(event, handler);
      }),
      send: vi.fn(),
      close: vi.fn(),
    };

    (WebSocket as any).mockImplementation(() => mockSocket);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create WebSocket with correct URL and parameters", () => {
    const chatroomId = 12345;

    createWebSocket(chatroomId);

    expect(WebSocket).toHaveBeenCalledWith(
      expect.stringContaining(
        "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679",
      ),
    );

    const callArgs = (WebSocket as any).mock.calls[0][0];
    expect(callArgs).toContain("protocol=7");
    expect(callArgs).toContain("client=js");
    expect(callArgs).toContain("version=8.4.0");
    expect(callArgs).toContain("flash=false");
  });

  it("should register open event handler", () => {
    const chatroomId = 12345;

    createWebSocket(chatroomId);

    expect(mockSocket.on).toHaveBeenCalledWith("open", expect.any(Function));
  });

  it("should send subscribe message when connection opens", () => {
    const chatroomId = 12345;

    createWebSocket(chatroomId);

    const openHandler = onHandlers.get("open");
    expect(openHandler).toBeDefined();

    openHandler!();

    expect(mockSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        event: "pusher:subscribe",
        data: { auth: "", channel: `chatrooms.${chatroomId}.v2` },
      }),
    );
  });

  it("should return WebSocket instance", () => {
    const chatroomId = 12345;

    const socket = createWebSocket(chatroomId);

    expect(socket).toBe(mockSocket);
  });

  it("should subscribe to correct chatroom channel", () => {
    const chatroomId = 67890;

    createWebSocket(chatroomId);

    const openHandler = onHandlers.get("open");
    openHandler!();

    const sentMessage = JSON.parse(mockSocket.send.mock.calls[0][0]);
    expect(sentMessage.data.channel).toBe("chatrooms.67890.v2");
  });
});
