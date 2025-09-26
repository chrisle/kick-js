import type { Channel, Livestream, VideoInfo } from "./video";
import type {
  CategoriesResponse,
  CategoryResponse,
} from "../apis/public/categories";
import type {
  ChannelsResponse,
  UpdateChannelOptions,
} from "../apis/public/channels";
import type {
  EventSubscriptionsResponse,
  CreateEventSubscriptionOptions,
  CreateEventSubscriptionResponse,
} from "../apis/public/events";
import type {
  LivestreamsResponse,
  LivestreamsStatsResponse,
  GetLivestreamsOptions,
} from "../apis/public/livestreams";
import type { ModerationResponse } from "../apis/public/moderation";
import type {
  TokenIntrospectResponse,
  UsersResponse,
} from "../apis/public/users";
import type { PublicKeyResponse } from "../apis/public/publicKey";

export type EventHandler<T> = (data: T) => void;

export interface ClientOptions {
  plainEmote?: boolean;
  logger?: boolean;
  readOnly?: boolean;
  puppeteerOptions?: {
    headless?: boolean;
    args?: string[];
    defaultViewport?: unknown;
    [key: string]: unknown;
  };
}

export interface Video {
  id: number;
  title: string;
  thumbnail: string;
  duration: number;
  live_stream_id: number;
  start_time: Date;
  created_at: Date;
  updated_at: Date;
  uuid: string;
  views: number;
  stream: string;
  language: string;
  livestream: Livestream;
  channel: Channel;
}

export interface KickClient {
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  off: (event: string, listener: (...args: unknown[]) => void) => void;
  removeAllListeners: (event?: string) => void;
  listenerCount: (event: string) => number;
  listeners: (event: string) => ((...args: unknown[]) => void)[];
  vod: (video_id: string) => Promise<VideoInfo | null>;
  login: (credentials: LoginOptions) => Promise<boolean>;
  user: {
    id: number;
    username: string;
    tag: string;
  } | null;
  sendMessage: (
    messageContent: string,
    targetChannelName?: string,
  ) => Promise<{
    data?: {
      is_sent?: boolean;
      message_id?: string;
    };
    message?: string;
  }>;
  banUser: (
    targetUser: string,
    durationInMinutes?: number,
    permanent?: boolean,
  ) => Promise<void>;
  unbanUser: (targetUser: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<{ success: boolean }>;
  slowMode: (
    mode: "on" | "off",
    durationInSeconds?: number,
  ) => Promise<{ success: boolean }>;
  getPoll: (targetChannel?: string) => Promise<Poll | null>;
  getLeaderboards: (targetChannel?: string) => Promise<Leaderboard | null>;
  searchCategories: (
    query: string,
    page?: number,
  ) => Promise<CategoriesResponse>;
  getCategory: (categoryId: number) => Promise<CategoryResponse>;
  getChannels: (options?: {
    broadcaster_user_id?: number[];
    slug?: string[];
  }) => Promise<ChannelsResponse>;
  updateChannel: (
    options: UpdateChannelOptions,
  ) => Promise<{ success: boolean; message: string }>;
  getEventSubscriptions: () => Promise<EventSubscriptionsResponse>;
  createEventSubscription: (
    data: CreateEventSubscriptionOptions,
  ) => Promise<CreateEventSubscriptionResponse>;
  deleteEventSubscriptions: (subscriptionIds: string[]) => Promise<void>;
  getLivestreams: (
    options?: GetLivestreamsOptions,
  ) => Promise<LivestreamsResponse>;
  getLivestreamsStats: () => Promise<LivestreamsStatsResponse>;
  banUserPublic: (
    broadcasterUserId: number,
    userId: number,
    durationInMinutes?: number,
    reason?: string,
  ) => Promise<ModerationResponse>;
  unbanUserPublic: (
    broadcasterUserId: number,
    userId: number,
  ) => Promise<ModerationResponse>;
  getPublicKey: () => Promise<PublicKeyResponse>;
  introspectToken: () => Promise<TokenIntrospectResponse>;
  getUsers: (userIds: number[]) => Promise<UsersResponse>;
}

export type LoginCredentials = {
  username: string;
  password: string;
  otp_secret?: string;
};

export type TokenCredentials = {
  bearerToken: string;
  xsrfToken: string;
  cookies: string;
};

export type OAuthCredentials = {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  scopes?: string[];
};

export type LoginOptions =
  | { type: "login"; credentials: LoginCredentials }
  | { type: "tokens"; credentials: TokenCredentials }
  | { type: "oauth"; credentials?: OAuthCredentials };

export type Poll = {
  status: {
    code: number;
    message: string;
    error: boolean;
  };
  data: {
    title: string;
    duration: number;
    result_display_duration: number;
    created_at: Date;
    options: {
      id: number;
      label: string;
      votes: number;
    }[];
    remaining: number;
    has_voted: boolean;
    voted_option_id: null;
  };
};

export type Leaderboard = {
  gifts: Gift[];
  gifts_enabled: boolean;
  gifts_week: Gift[];
  gifts_week_enabled: boolean;
  gifts_month: Gift[];
  gifts_month_enabled: boolean;
};

export type Gift = {
  user_id: number;
  username: string;
  quantity: number;
};
