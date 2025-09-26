import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEventSubscriptions, createEventSubscription, deleteEventSubscriptions } from './events';
import { describeWithTokens, describeWithoutTokens, getTestConfig } from '../../test-utils/testConfig';

// Mock fetch globally
global.fetch = vi.fn();

describeWithoutTokens('Events API (Mock Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getEventSubscriptions', () => {
    it('should get event subscriptions successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 'sub_123456789',
            events: ['chat.message.created', 'channel.follow.created'],
            callback_url: 'https://example.com/webhook',
            status: 'active'
          }
        ],
        message: 'Successfully retrieved event subscriptions'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await getEventSubscriptions('test-bearer-token');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/events/subscriptions', {
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Accept': 'application/json'
        }
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401
      });

      await expect(getEventSubscriptions('invalid-token')).rejects.toThrow(
        'Get event subscriptions failed: 401'
      );
    });
  });

  describe('createEventSubscription', () => {
    it('should create event subscription successfully', async () => {
      const mockResponse = {
        data: {
          subscription_id: 'sub_123456789',
          events: ['chat.message.created'],
          callback_url: 'https://example.com/webhook',
          status: 'active'
        },
        message: 'Successfully subscribed to events'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const subscription = {
        events: ['chat.message.created' as const],
        callback_url: 'https://example.com/webhook'
      };

      const result = await createEventSubscription('test-bearer-token', subscription);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/events/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          events: ['chat.message.created'],
          method: 'webhook'
        })
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403
      });

      const subscription = {
        events: ['chat.message.created' as const],
        callback_url: 'https://example.com/webhook'
      };

      await expect(createEventSubscription('invalid-token', subscription)).rejects.toThrow(
        'Create event subscription failed: 403'
      );
    });
  });

  describe('deleteEventSubscriptions', () => {
    it('should delete event subscriptions successfully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true
      });

      await deleteEventSubscriptions('test-bearer-token', ['sub_123']);

      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/events/subscriptions?id=sub_123', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Accept': 'application/json'
        }
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(deleteEventSubscriptions('invalid-token', ['sub_123'])).rejects.toThrow(
        'Delete event subscriptions failed: 404'
      );
    });
  });
});

describeWithTokens('Events API (Integration Tests)', () => {
  const config = getTestConfig();

  it('should validate credentials for events', () => {
    if (!config.tokenCredentials?.bearerToken) {
      console.log('Skipping events integration test - no bearer token available');
      console.log('Run "pnpm run getOauthTokens" first to get OAuth credentials');
      return;
    }

    // NOTE: We don't actually create/delete event subscriptions in tests
    // as that would create persistent subscriptions
    expect(config.tokenCredentials.bearerToken).toBeDefined();
  });
});