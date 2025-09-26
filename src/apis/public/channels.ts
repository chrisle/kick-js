/**
 * Kick.com Public Channels API
 * https://docs.kick.com/apis/channels
 */

export interface ChannelData {
  banner_picture?: string;
  broadcaster_user_id: number;
  category?: {
    id: number;
    name: string;
  };
  channel_description?: string;
  slug: string;
  livestream?: {
    id: number;
    is_live: boolean;
    thumbnail?: string;
    viewer_count: number;
    stream_title?: string;
  };
}

export interface ChannelsResponse {
  data: ChannelData[];
  message: string;
}

export interface UpdateChannelOptions {
  category_id?: number;
  custom_tags?: string[];
  stream_title?: string;
}

/**
 * Get channels using the official Kick.com API
 * @param bearerToken - Bearer token for authentication
 * @param options - Optional parameters (broadcaster_user_id OR slug, cannot mix)
 * @returns Promise resolving to channels data
 */
export const getChannels = async (
  bearerToken: string,
  options: {
    broadcaster_user_id?: number[];
    slug?: string[];
  } = {}
): Promise<ChannelsResponse> => {
  const params = new URLSearchParams();

  if (options.broadcaster_user_id && options.slug) {
    throw new Error('Cannot use both broadcaster_user_id and slug parameters');
  }

  if (options.broadcaster_user_id) {
    if (options.broadcaster_user_id.length > 50) {
      throw new Error('Maximum 50 broadcaster user IDs allowed');
    }
    options.broadcaster_user_id.forEach(id =>
      params.append('broadcaster_user_id', id.toString())
    );
  }

  if (options.slug) {
    if (options.slug.length > 50) {
      throw new Error('Maximum 50 slugs allowed');
    }
    options.slug.forEach(slug => {
      if (slug.length > 25) {
        throw new Error('Slug must be 25 characters or less');
      }
      params.append('slug', slug);
    });
  }

  const url = `https://api.kick.com/public/v1/channels${params.toString() ? '?' + params.toString() : ''}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Get channels failed: ${response.status}`);
  }

  return await response.json() as ChannelsResponse;
};

/**
 * Update channel settings using the official Kick.com API
 * @param bearerToken - Bearer token for authentication
 * @param options - Channel update options
 * @returns Promise resolving to success response
 */
export const updateChannel = async (
  bearerToken: string,
  options: UpdateChannelOptions
): Promise<{ success: boolean; message: string }> => {
  if (!options.category_id && !options.custom_tags && !options.stream_title) {
    throw new Error('At least one update option must be provided');
  }

  const body: Record<string, unknown> = {};

  if (options.category_id) {
    body.category_id = options.category_id;
  }

  if (options.custom_tags) {
    body.custom_tags = options.custom_tags;
  }

  if (options.stream_title) {
    body.stream_title = options.stream_title;
  }

  const response = await fetch('https://api.kick.com/public/v1/channels', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Update channel failed: ${response.status}`);
  }

  const result = await response.json();
  return {
    success: true,
    message: result.message || 'Channel updated successfully'
  };
};