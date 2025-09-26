/**
 * Kick.com Public Users API
 * https://docs.kick.com/apis/users
 */

export interface TokenIntrospectResponse {
  active: boolean;
  client_id: string;
  exp?: number;
  scope?: string;
}

export interface UserData {
  email?: string;
  name: string;
  profile_picture?: string;
  user_id: number;
}

export interface UsersResponse {
  data: UserData[];
  message: string;
}

/**
 * Introspect the current access token
 * @param bearerToken - Bearer token for authentication
 * @returns Promise resolving to token introspection data
 */
export const introspectToken = async (
  bearerToken: string
): Promise<TokenIntrospectResponse> => {
  const response = await fetch('https://api.kick.com/public/v1/token/introspect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Token introspect failed: ${response.status}`);
  }

  return await response.json() as TokenIntrospectResponse;
};

/**
 * Get users using the official Kick.com API
 * @param bearerToken - Bearer token for authentication
 * @param userIds - Optional array of user IDs to fetch
 * @returns Promise resolving to users data
 */
export const getUsers = async (
  bearerToken: string,
  userIds?: number[]
): Promise<UsersResponse> => {
  const params = new URLSearchParams();

  if (userIds && userIds.length > 0) {
    userIds.forEach(id => params.append('id', id.toString()));
  }

  const url = `https://api.kick.com/public/v1/users${params.toString() ? '?' + params.toString() : ''}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Get users failed: ${response.status}`);
  }

  return await response.json() as UsersResponse;
};