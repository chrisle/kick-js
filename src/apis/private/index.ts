/**
 * Private Kick.com APIs
 * Re-exports all unofficial/private API methods
 */

// Authentication API
export { authentication } from "./authentication";

// Channel Data Scraping
export { getChannelData, setChannelDataProvider } from "./channelData";

// Video Data Scraping
export { getVideoData } from "./videoData";

// Featured Livestreams
export { getFeaturedLivestreams } from "./featuredLivestreams";

// Private Moderation Methods
export { deleteMessage, setSlowMode } from "./moderation";
