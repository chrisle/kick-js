/**
 * Kick.com Official Livestreams API
 * https://docs.kick.com/apis/livestreams
 */

export interface LivestreamData {
  broadcaster_user_id: number;
  category_id: number;
  channel_id: number;
  is_mature: boolean;
  language: string;
  slug: string;
  started_at: string;
  stream_title: string;
  thumbnail?: string;
  viewer_count: number;
}

export interface LivestreamsResponse {
  data: LivestreamData[];
  message: string;
}

export interface LivestreamsStatsResponse {
  data: {
    total_livestreams: number;
    total_viewers: number;
  };
  message: string;
}

export interface GetLivestreamsOptions {
  broadcaster_user_id?: number | number[];
  category_id?: number;
  language?: string;
  limit?: number; // 1-100
  sort?: 'viewer_count' | 'started_at';
}

/**
 * Get livestreams using the official Kick.com API
 * @param bearerToken - Bearer token for authentication
 * @param options - Optional query parameters
 * @returns Promise resolving to livestreams data
 */
export const getLivestreams = async (
  bearerToken: string,
  options: GetLivestreamsOptions = {}
): Promise<LivestreamsResponse> => {
  const params = new URLSearchParams();

  if (options.broadcaster_user_id) {
    if (Array.isArray(options.broadcaster_user_id)) {
      options.broadcaster_user_id.forEach(id =>
        params.append('broadcaster_user_id', id.toString())
      );
    } else {
      params.append('broadcaster_user_id', options.broadcaster_user_id.toString());
    }
  }

  if (options.category_id) {
    params.append('category_id', options.category_id.toString());
  }

  if (options.language) {
    params.append('language', options.language);
  }

  if (options.limit) {
    if (options.limit < 1 || options.limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
    params.append('limit', options.limit.toString());
  }

  if (options.sort) {
    params.append('sort', options.sort);
  }

  const url = `https://api.kick.com/public/v1/livestreams${params.toString() ? '?' + params.toString() : ''}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Get livestreams failed: ${response.status}`);
  }

  return await response.json() as LivestreamsResponse;
};

/**
 * Get livestreams statistics using the official Kick.com API
 * @param bearerToken - Bearer token for authentication
 * @returns Promise resolving to livestreams statistics
 */
export const getLivestreamsStats = async (
  bearerToken: string
): Promise<LivestreamsStatsResponse> => {
  const response = await fetch('https://api.kick.com/public/v1/livestreams/stats', {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Get livestreams stats failed: ${response.status}`);
  }

  return await response.json() as LivestreamsStatsResponse;
};