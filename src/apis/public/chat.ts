/**
 * Kick.com Official Chat API
 * https://docs.kick.com/apis/chat
 */

/**
 * Send a message to a Kick.com chat channel
 * @param content - Message content
 * @param bearerToken - OAuth bearer token
 * @param broadcasterUserId - Optional broadcaster user ID. If provided, sends as 'user' type to that channel. If omitted, sends as 'bot' type to the token's channel.
 * @returns Promise resolving to message response
 */
export const sendChatMessage = async (
  content: string,
  bearerToken: string,
  broadcasterUserId?: number
): Promise<{
  data: {
    is_sent: boolean;
    message_id: string;
  };
  message: string;
}> => {
  const body: {
    content: string;
    type: 'bot' | 'user';
    broadcaster_user_id?: number;
  } = {
    content,
    type: broadcasterUserId ? 'user' : 'bot'
  };

  if (broadcasterUserId) {
    body.broadcaster_user_id = broadcasterUserId;
  }

  const response = await fetch('https://api.kick.com/public/v1/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Message send failed: ${response.status} ${error}`);
  }

  return await response.json() as {
    data: {
      is_sent: boolean;
      message_id: string;
    };
    message: string;
  };
};