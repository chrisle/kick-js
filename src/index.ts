import { createClient } from "./client/client";
import type { MessageData } from "./types/events.js";
import type { KickClient } from "./types/client.js";
import { getFeaturedLivestreams } from "./apis/private/featuredLivestreams";
import type { GetFeaturedLivestreamsOptions } from "./apis/private/featuredLivestreams";

export { createClient, getFeaturedLivestreams };
export type { MessageData, GetFeaturedLivestreamsOptions, KickClient };
