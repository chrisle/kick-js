/**
 * Private/Unofficial Moderation API methods
 * These use unofficial endpoints and require additional authentication
 */

/**
 * Delete a message from chat using unofficial endpoint
 * @param chatroomId - Chatroom ID
 * @param messageId - Message ID to delete
 * @param bearerToken - Bearer token
 * @param xsrfToken - XSRF token
 * @param cookies - Cookie string
 * @returns Promise resolving to deletion result
 */
export const deleteMessage = async (
  chatroomId: number,
  messageId: string,
  bearerToken: string,
  xsrfToken: string,
  cookies: string,
): Promise<{ success: boolean }> => {
  const response = await fetch(
    `https://kick.com/api/v2/chatrooms/${chatroomId}/messages/${messageId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "X-XSRF-TOKEN": xsrfToken,
        Accept: "application/json",
        Cookie: cookies,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Delete message failed: ${response.status}`);
  }

  return { success: true };
};

/**
 * Set slow mode for a channel using unofficial endpoint
 * @param channelSlug - Channel slug
 * @param enabled - Whether to enable slow mode
 * @param bearerToken - Bearer token
 * @param xsrfToken - XSRF token
 * @param cookies - Cookie string
 * @param duration - Duration in seconds between messages
 * @returns Promise resolving to slow mode result
 */
export const setSlowMode = async (
  channelSlug: string,
  enabled: boolean,
  bearerToken: string,
  xsrfToken: string,
  cookies: string,
  duration?: number,
): Promise<{ success: boolean }> => {
  const data = enabled
    ? { slow_mode: true, message_interval: duration || 10 }
    : { slow_mode: false };

  const response = await fetch(
    `https://kick.com/api/v1/channels/${channelSlug}/chatroom/settings`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "X-XSRF-TOKEN": xsrfToken,
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookies,
        Referer: `https://kick.com/${channelSlug}`,
      },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    throw new Error(`Slow mode update failed: ${response.status}`);
  }

  return { success: true };
};
