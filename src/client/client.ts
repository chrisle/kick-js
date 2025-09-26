import type WebSocket from "ws";
import EventEmitter from "events";

// Public Kick.com APIs
import { sendChatMessage } from "../apis/public/chat";
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
import {
  banUser as apiBanUser,
  unbanUser as apiUnbanUser,
} from "../apis/public/moderation";
import { getPublicKey } from "../apis/public/publicKey";
import { introspectToken, getUsers } from "../apis/public/users";

// Private APIs
import { authentication } from "../apis/private/authentication";
import { getChannelData } from "../apis/private/channelData";
import { getVideoData } from "../apis/private/videoData";
import {
  deleteMessage as apiDeleteMessage,
  setSlowMode as apiSetSlowMode,
} from "../apis/private/moderation";

// Core
import { createWebSocket } from "../core/websocket";
import { parseMessage } from "../core/messageHandling";

// Types
import type { KickChannelInfo } from "../types/channels";
import type {
  KickClient,
  ClientOptions,
  Poll,
  Leaderboard,
  LoginOptions,
  LoginCredentials,
  TokenCredentials,
  OAuthCredentials,
} from "../types/client";

// Utils
import { validateCredentials } from "../utils/utils";
import {
  refreshOAuthToken,
  updateEnvTokens,
  shouldRefreshToken,
} from "../utils/tokenRefresh";

// Re-export public APIs for direct use
export { sendChatMessage } from "../apis/public/chat";
export { searchCategories, getCategory } from "../apis/public/categories";
export { getChannels, updateChannel } from "../apis/public/channels";
export {
  getEventSubscriptions,
  createEventSubscription,
  deleteEventSubscriptions,
} from "../apis/public/events";
export {
  getLivestreams,
  getLivestreamsStats,
} from "../apis/public/livestreams";
export {
  banUser as banUserPublic,
  unbanUser as unbanUserPublic,
} from "../apis/public/moderation";
export { getPublicKey } from "../apis/public/publicKey";
export { introspectToken, getUsers } from "../apis/public/users";

// Re-export private APIs for direct use
export { getChannelData } from "../apis/private/channelData";
export { getVideoData } from "../apis/private/videoData";
export {
  deleteMessage as deleteMessageDirect,
  setSlowMode as setSlowModeDirect,
} from "../apis/private/moderation";

interface MessageData {
  content: string;
  sender: {
    username: string;
  };
}

/**
 * Create a new Kick.com client for the specified channel
 *
 * The client provides access to both public and private Kick.com APIs:
 * - Public APIs (require authentication)
 * - Private APIs (use Puppeteer)
 *
 * @param channelName - Name of the channel to connect to
 * @param options - Optional client configuration options
 * @returns KickClient instance with methods for interacting with chat and API
 */
export const createClient = (
  channelName: string,
  options: ClientOptions = {},
): KickClient => {
  // State
  const emitter = new EventEmitter();
  let socket: WebSocket | null = null;
  let channelInfo: KickChannelInfo | null = null;

  // Public API credentials (OAuth)
  let publicBearerToken: string | null = null;
  let oauthClientId: string | null = null;
  let oauthClientSecret: string | null = null;
  let oauthRefreshToken: string | null = null;
  let tokenExpiresIn: number | null = null;
  let tokenUpdatedAt: string | null = null;

  // Private API credentials (login/tokens)
  let privateBearerToken: string | null = null;
  let privateToken: string | null = null;
  let privateCookies: string | null = null;
  let privateCredentials: LoginCredentials | null = null;

  let isLoggedIn = false;

  const defaultOptions: ClientOptions = {
    logger: false,
    readOnly: false,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  // Helper functions
  const refreshTokenIfNeeded = async (): Promise<void> => {
    // Only refresh if we have OAuth credentials and refresh token
    if (
      !oauthClientId ||
      !oauthClientSecret ||
      !oauthRefreshToken ||
      !tokenExpiresIn ||
      !tokenUpdatedAt
    ) {
      return;
    }

    // Check if token needs refresh
    if (shouldRefreshToken(tokenUpdatedAt, tokenExpiresIn)) {
      if (mergedOptions.logger) {
        console.debug("OAuth token expired or about to expire, refreshing...");
      }

      try {
        const newTokens = await refreshOAuthToken(
          oauthClientId,
          oauthClientSecret,
          oauthRefreshToken,
        );

        // Update in-memory tokens
        publicBearerToken = newTokens.access_token;
        tokenExpiresIn = newTokens.expires_in;
        tokenUpdatedAt = new Date().toISOString();

        if (newTokens.refresh_token) {
          oauthRefreshToken = newTokens.refresh_token;
        }

        // Update .env file
        updateEnvTokens(newTokens);

        if (mergedOptions.logger) {
          console.debug("✅ OAuth token refreshed successfully");
        }
      } catch (error) {
        if (mergedOptions.logger) {
          console.error("❌ Failed to refresh OAuth token:", error);
        }
        throw new Error(
          `Failed to refresh OAuth token: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  };

  const checkPublicAuth = async () => {
    if (!publicBearerToken) {
      throw new Error(
        "Public API authentication required. Please login with OAuth first.",
      );
    }

    // Try to refresh token if needed
    await refreshTokenIfNeeded();
  };

  const checkPrivateAuth = () => {
    if (!privateBearerToken && !privateCredentials) {
      throw new Error(
        "Private API authentication required. Please login with credentials or tokens first.",
      );
    }
  };

  const checkAnyAuth = () => {
    if (!isLoggedIn) {
      throw new Error("Authentication required. Please login first.");
    }
  };

  const getUser = () =>
    channelInfo
      ? {
          id: channelInfo.id,
          username: channelInfo.slug,
          tag: channelInfo.user.username,
        }
      : null;

  // Core methods
  const login = async (options: LoginOptions) => {
    try {
      const credentials =
        "credentials" in options ? options.credentials : undefined;
      const { type } = options;

      switch (type) {
        case "login":
          if (!credentials) {
            throw new Error("Credentials are required for login");
          }

          validateCredentials(options);

          const loginCreds = credentials as LoginCredentials;
          const authData = await authentication(
            {
              username: loginCreds.username,
              password: loginCreds.password,
              otp_secret: loginCreds.otp_secret,
            },
            channelName,
            mergedOptions.puppeteerOptions as Parameters<
              typeof authentication
            >[2],
          );

          privateBearerToken = authData.bearerToken;
          privateToken = authData.xsrfToken;
          privateCookies = authData.cookies;
          privateCredentials = loginCreds;
          isLoggedIn = authData.isAuthenticated;

          await initialize();
          break;

        case "tokens":
          if (!credentials) {
            throw new Error("Token credentials are required");
          }

          validateCredentials(options);

          const tokenCreds = credentials as TokenCredentials;
          privateBearerToken = tokenCreds.bearerToken;
          privateToken = tokenCreds.xsrfToken;
          privateCookies = tokenCreds.cookies;
          isLoggedIn = true;

          await initialize();
          break;

        case "oauth":
          if (mergedOptions.logger) {
            console.debug("Using OAuth credentials...");
          }

          const oauthCreds = credentials as OAuthCredentials;
          const accessToken =
            oauthCreds?.accessToken || process.env.KICK_ACCESS_TOKEN;

          if (!accessToken) {
            throw new Error(
              "OAuth access token not found in credentials or environment (KICK_ACCESS_TOKEN)",
            );
          }

          publicBearerToken = accessToken;

          // Store OAuth refresh token and credentials for automatic refresh
          oauthClientId = process.env.KICK_CLIENT_ID || null;
          oauthClientSecret = process.env.KICK_CLIENT_SECRET || null;
          oauthRefreshToken = process.env.KICK_REFRESH_TOKEN || null;
          tokenExpiresIn = process.env.KICK_EXPIRES_IN
            ? parseInt(process.env.KICK_EXPIRES_IN, 10)
            : null;
          tokenUpdatedAt = process.env.KICK_TOKEN_UPDATED || null;

          if (mergedOptions.logger && oauthRefreshToken) {
            console.debug("✅ Automatic token refresh enabled");
          }

          // Also initialize if this is the first login
          if (!isLoggedIn) {
            isLoggedIn = true;
            await initialize();
          }
          break;

        default:
          throw new Error("Invalid authentication type");
      }

      return true;
    } catch (error) {
      if (mergedOptions.logger) {
        console.error("Login failed:", error);
      }
      throw error;
    }
  };

  const initialize = async () => {
    try {
      if (mergedOptions.logger) {
        console.debug(`Fetching channel data for: ${channelName}`);
      }

      channelInfo = await getChannelData(
        channelName,
        mergedOptions.puppeteerOptions as Parameters<typeof getChannelData>[1],
      );

      if (!channelInfo) {
        throw new Error(`Unable to fetch data for channel '${channelName}'`);
      }

      if (mergedOptions.logger) {
        console.debug(
          "Channel data received, establishing WebSocket connection...",
        );
      }

      socket = createWebSocket(channelInfo.chatroom.id);

      socket.on("message", (data) => {
        const dataStr = Buffer.isBuffer(data) ? data.toString() : String(data);
        const parsedMessage = parseMessage(dataStr);

        if (parsedMessage) {
          if (parsedMessage.type === "ChatMessage") {
            const messageData = parsedMessage.data as MessageData;
            emitter.emit("ChatMessage", messageData);
          }
        }
      });

      socket.on("open", () => {
        if (mergedOptions.logger) {
          console.debug(`Connected to channel: ${channelName}`);
        }
        emitter.emit("ready", getUser());
      });

      socket.on("error", (error) => {
        if (mergedOptions.logger) {
          console.error("WebSocket error:", error);
        }
        emitter.emit("error", error);
      });
    } catch (error) {
      if (mergedOptions.logger) {
        console.error("Initialization failed:", error);
      }
      throw error;
    }
  };

  // Event handling methods
  const on = (event: string, listener: (...args: unknown[]) => void) => {
    emitter.on(event, listener);
  };

  const off = (event: string, listener: (...args: unknown[]) => void) => {
    emitter.off(event, listener);
  };

  const removeAllListeners = (event?: string) => {
    emitter.removeAllListeners(event);
  };

  const listenerCount = (event: string) => {
    return emitter.listenerCount(event);
  };

  const listeners = (event: string): ((...args: unknown[]) => void)[] => {
    return emitter.listeners(event) as ((...args: unknown[]) => void)[];
  };

  // Private API methods
  const vod = (video_id: string) =>
    getVideoData(
      video_id,
      mergedOptions.puppeteerOptions as Parameters<typeof getVideoData>[1],
    );

  const sendMessage = async (
    messageContent: string,
    targetChannelName?: string,
  ) => {
    if (!channelInfo) throw new Error("Channel info not available");
    await checkPublicAuth();

    let broadcasterUserId: number | undefined;
    if (targetChannelName) {
      const targetChannelInfo = await getChannelData(
        targetChannelName,
        mergedOptions.puppeteerOptions as Parameters<typeof getChannelData>[1],
      );
      if (!targetChannelInfo) {
        throw new Error(
          `Unable to fetch data for channel '${targetChannelName}'`,
        );
      }
      broadcasterUserId = targetChannelInfo.user_id;
    }

    return sendChatMessage(
      messageContent,
      publicBearerToken!,
      broadcasterUserId,
    );
  };

  const banUser = (
    _targetUser: string,
    _durationInMinutes?: number,
    _permanent: boolean = false,
  ) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    checkPrivateAuth();

    try {
      throw new Error(
        "Ban user not yet implemented with new public API - requires user ID instead of username",
      );
    } catch (error) {
      if (mergedOptions.logger) {
        console.error(
          `Error ${_permanent ? "banning" : "timing out"} user:`,
          error,
        );
      }
      throw error;
    }
  };

  const unbanUser = (_targetUser: string) => {
    if (!channelInfo) {
      throw new Error("Channel info not available");
    }

    checkPrivateAuth();

    try {
      throw new Error(
        "Unban user not yet implemented with new public API - requires user ID instead of username",
      );
    } catch (error) {
      if (mergedOptions.logger) {
        console.error("Error unbanning user:", error);
      }
      throw error;
    }
  };

  // Return client interface
  return {
    // Authentication & initialization
    login,

    // Event handling
    on,
    off,
    removeAllListeners,
    listenerCount,
    listeners,

    // User info
    get user() {
      return getUser();
    },

    // Private API methods
    vod,
    sendMessage,
    banUser,
    unbanUser,
    deleteMessage: async (messageId: string) => {
      if (!channelInfo) throw new Error("Channel info not available");
      checkPrivateAuth();
      return apiDeleteMessage(
        channelInfo.chatroom.id,
        messageId,
        privateBearerToken!,
        privateToken!,
        privateCookies!,
      );
    },
    slowMode: async (mode: "on" | "off", durationInSeconds?: number) => {
      if (!channelInfo) throw new Error("Channel info not available");
      checkPrivateAuth();
      return apiSetSlowMode(
        channelInfo.slug,
        mode === "on",
        privateBearerToken!,
        privateToken!,
        privateCookies!,
        durationInSeconds,
      );
    },
    getPoll: async (targetChannel?: string): Promise<Poll | null> => {
      checkPrivateAuth();
      const channelData = targetChannel
        ? await getChannelData(
            targetChannel,
            mergedOptions.puppeteerOptions as Parameters<
              typeof getChannelData
            >[1],
          )
        : channelInfo;
      if (!channelData) throw new Error("Channel data not available");
      throw new Error("Get poll not yet available in public API");
    },
    getLeaderboards: async (
      targetChannel?: string,
    ): Promise<Leaderboard | null> => {
      checkPrivateAuth();
      const channelData = targetChannel
        ? await getChannelData(
            targetChannel,
            mergedOptions.puppeteerOptions as Parameters<
              typeof getChannelData
            >[1],
          )
        : channelInfo;
      if (!channelData) throw new Error("Channel data not available");
      throw new Error("Get leaderboards not yet available in public API");
    },

    // Public API - Categories
    searchCategories: async (query: string, page?: number) => {
      await checkPublicAuth();
      return searchCategories(publicBearerToken!, query, page);
    },
    getCategory: async (categoryId: number) => {
      await checkPublicAuth();
      return getCategory(publicBearerToken!, categoryId);
    },

    // Public API - Channels
    getChannels: async (options?: Parameters<typeof getChannels>[1]) => {
      await checkPublicAuth();
      return getChannels(publicBearerToken!, options);
    },
    updateChannel: async (options: Parameters<typeof updateChannel>[1]) => {
      await checkPublicAuth();
      return updateChannel(publicBearerToken!, options);
    },

    // Public API - Events
    getEventSubscriptions: async () => {
      await checkPublicAuth();
      return getEventSubscriptions(publicBearerToken!);
    },
    createEventSubscription: async (
      data: Parameters<typeof createEventSubscription>[1],
    ) => {
      await checkPublicAuth();
      return createEventSubscription(publicBearerToken!, data);
    },
    deleteEventSubscriptions: async (subscriptionIds: string[]) => {
      await checkPublicAuth();
      return deleteEventSubscriptions(publicBearerToken!, subscriptionIds);
    },

    // Public API - Livestreams
    getLivestreams: async (options?: Parameters<typeof getLivestreams>[1]) => {
      await checkPublicAuth();
      return getLivestreams(publicBearerToken!, options);
    },
    getLivestreamsStats: async () => {
      await checkPublicAuth();
      return getLivestreamsStats(publicBearerToken!);
    },

    // Public API - Moderation
    banUserPublic: async (
      broadcasterUserId: number,
      userId: number,
      durationInMinutes?: number,
      reason?: string,
    ) => {
      await checkPublicAuth();
      return apiBanUser(
        publicBearerToken!,
        broadcasterUserId,
        userId,
        durationInMinutes,
        reason,
      );
    },
    unbanUserPublic: async (broadcasterUserId: number, userId: number) => {
      await checkPublicAuth();
      return apiUnbanUser(publicBearerToken!, broadcasterUserId, userId);
    },

    // Public API - Other
    getPublicKey: () => getPublicKey(),
    introspectToken: async () => {
      await checkPublicAuth();
      return introspectToken(publicBearerToken!);
    },
    getUsers: async (userIds: number[]) => {
      await checkPublicAuth();
      return getUsers(publicBearerToken!, userIds);
    },
  };
};
