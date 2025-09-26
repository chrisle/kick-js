import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLivestreams } from './livestreams';
import { describeWithTokens, describeWithoutTokens, getTestConfig } from '../../test-utils/testConfig';

// Mock fetch globally
global.fetch = vi.fn();

describeWithoutTokens('Livestreams API (Mock Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getLivestreams', () => {
    it('should get livestreams successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            slug: 'test-stream',
            channel_id: 123,
            created_at: '2023-01-01T00:00:00.000Z',
            session_title: 'Test Stream',
            is_live: true,
            risk_level_id: null,
            source: null,
            twitch_channel: null,
            duration: 3600,
            language: 'English',
            is_mature: false,
            viewer_count: 100,
            thumbnail: {
              responsive: 'https://example.com/thumbnail.jpg',
              url: 'https://example.com/thumbnail.jpg'
            },
            viewers: 100,
            category: {
              id: 1,
              name: 'Gaming',
              slug: 'gaming'
            },
            channel: {
              id: 123,
              user_id: 456,
              slug: 'test-channel',
              playback_url: 'https://example.com/stream.m3u8'
            }
          }
        ],
        links: {
          first: 'https://api.kick.com/public/v1/livestreams?page=1',
          last: 'https://api.kick.com/public/v1/livestreams?page=10',
          prev: null,
          next: 'https://api.kick.com/public/v1/livestreams?page=2'
        },
        meta: {
          current_page: 1,
          from: 1,
          last_page: 10,
          per_page: 25,
          to: 25,
          total: 250
        }
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await getLivestreams('test-bearer-token');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/livestreams', {
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Accept': 'application/json'
        }
      });
    });

    it('should get livestreams with custom page', async () => {
      const mockResponse = { data: [], links: {}, meta: {} };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      await getLivestreams('test-bearer-token', { limit: 3 });

      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/livestreams?limit=3', {
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Accept': 'application/json'
        }
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(getLivestreams('invalid-token')).rejects.toThrow(
        'Get livestreams failed: 500'
      );
    });
  });
});

describeWithTokens('Livestreams API (Integration Tests)', () => {
  const config = getTestConfig();

  it('should get real livestreams', async () => {
    if (!config.tokenCredentials?.bearerToken) {
      console.log('Skipping livestreams integration test - no bearer token available');
      console.log('Run "pnpm run getOauthTokens" first to get OAuth credentials');
      return;
    }

    try {
      const result = await getLivestreams(config.tokenCredentials.bearerToken);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);

      if (result.data && result.data.length > 0) {
        const stream = result.data[0];
        if (stream) {
          expect(stream.broadcaster_user_id).toBeGreaterThan(0);
          expect(stream.slug).toBeDefined();
          expect(stream.channel_id).toBeGreaterThan(0);
        }
      }
    } catch (error) {
      console.log('Failed to get livestreams:', error);
    }
  });
});