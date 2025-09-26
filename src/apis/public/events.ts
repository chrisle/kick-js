/**
 * Kick.com Events Subscription API
 * https://docs.kick.com/events/subscribe-to-events
 */

export interface EventSubscription {
  id: string;
  broadcaster_user_id?: number;
  events: string[];
  method: string;
  created_at: string;
  updated_at: string;
}

export interface EventSubscriptionsResponse {
  data: EventSubscription[];
  message: string;
}

export interface CreateEventSubscriptionOptions {
  broadcaster_user_id?: number;
  events: string[];
  method?: string; // defaults to "webhook"
}

export interface CreateEventSubscriptionResponse {
  data: EventSubscription;
  message: string;
}

/**
 * Get current event subscriptions
 * @param bearerToken - Bearer token for authentication
 * @returns Promise resolving to event subscriptions data
 */
export const getEventSubscriptions = async (
  bearerToken: string
): Promise<EventSubscriptionsResponse> => {
  const response = await fetch('https://api.kick.com/public/v1/events/subscriptions', {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Get event subscriptions failed: ${response.status}`);
  }

  return await response.json() as EventSubscriptionsResponse;
};

/**
 * Subscribe to events via webhooks
 * @param bearerToken - Bearer token for authentication
 * @param options - Event subscription options
 * @returns Promise resolving to created subscription data
 */
export const createEventSubscription = async (
  bearerToken: string,
  options: CreateEventSubscriptionOptions
): Promise<CreateEventSubscriptionResponse> => {
  if (!options.events || options.events.length === 0) {
    throw new Error('Events array is required and cannot be empty');
  }

  const body = {
    broadcaster_user_id: options.broadcaster_user_id,
    events: options.events,
    method: options.method || 'webhook'
  };

  const response = await fetch('https://api.kick.com/public/v1/events/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Create event subscription failed: ${response.status}`);
  }

  return await response.json() as CreateEventSubscriptionResponse;
};

/**
 * Delete event subscriptions
 * @param bearerToken - Bearer token for authentication
 * @param subscriptionIds - Array of subscription IDs to delete
 * @returns Promise resolving to success
 */
export const deleteEventSubscriptions = async (
  bearerToken: string,
  subscriptionIds: string[]
): Promise<void> => {
  if (!subscriptionIds || subscriptionIds.length === 0) {
    throw new Error('Subscription IDs are required');
  }

  const params = new URLSearchParams();
  subscriptionIds.forEach(id => params.append('id', id));

  const response = await fetch(`https://api.kick.com/public/v1/events/subscriptions?${params.toString()}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Delete event subscriptions failed: ${response.status}`);
  }
};