/**
 * Kick.com Public Moderation API
 * https://docs.kick.com/apis/moderation
 */

export interface ModerationResponse {
  message: string;
}

/**
 * Ban or timeout a user from participating in a broadcaster's chat room
 * @param bearerToken - Bearer token for authentication
 * @param broadcasterUserId - Broadcaster's user ID
 * @param userId - User ID to ban
 * @param duration - Duration in minutes for timeout (optional, omit for permanent ban)
 * @param reason - Reason for ban (max 100 characters, optional)
 * @returns Promise resolving to moderation response
 */
export const banUser = async (
  bearerToken: string,
  broadcasterUserId: number,
  userId: number,
  duration?: number,
  reason?: string
): Promise<ModerationResponse> => {
  const body: Record<string, unknown> = {
    broadcaster_user_id: broadcasterUserId,
    user_id: userId
  };

  if (duration !== undefined) {
    body.duration = duration;
  }

  if (reason) {
    if (reason.length > 100) {
      throw new Error('Reason must be 100 characters or less');
    }
    body.reason = reason;
  }

  const response = await fetch('https://api.kick.com/public/v1/moderation/bans', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Ban user failed: ${response.status}`);
  }

  return await response.json() as ModerationResponse;
};

/**
 * Unban or remove timeout that was placed on a specific user
 * @param bearerToken - Bearer token for authentication
 * @param broadcasterUserId - Broadcaster's user ID
 * @param userId - User ID to unban
 * @returns Promise resolving to moderation response
 */
export const unbanUser = async (
  bearerToken: string,
  broadcasterUserId: number,
  userId: number
): Promise<ModerationResponse> => {
  const body = {
    broadcaster_user_id: broadcasterUserId,
    user_id: userId
  };

  const response = await fetch('https://api.kick.com/public/v1/moderation/bans', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Unban user failed: ${response.status}`);
  }

  return await response.json() as ModerationResponse;
};