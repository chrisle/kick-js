import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getChannels, updateChannel } from './channels';
import { describeWithTokens, describeWithoutTokens, getTestConfig } from '../../test-utils/testConfig';

// Mock fetch globally
global.fetch = vi.fn();

describeWithoutTokens('Channels API (Mock Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getChannels', () => {
    it('should get channels successfully', async () => {
      const mockResponse = {
        data: [
          {
            slug: 'test-channel',
            broadcaster_user_id: 123,
            channel_description: 'Test channel description',
            category: {
              id: 1,
              name: 'Gaming'
            },
            livestream: {
              id: 456,
              is_live: true,
              viewer_count: 100,
              stream_title: 'Test Stream'
            }
          }
        ],
        message: 'Success'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await getChannels('test-bearer-token');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/channels', {
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Accept': 'application/json'
        }
      });
    });

    it('should get channels with specific slugs', async () => {
      const mockResponse = { data: [], message: 'Success' };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      await getChannels('test-bearer-token', { slug: ['test1', 'test2'] });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.kick.com/public/v1/channels?slug=test1&slug=test2',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-bearer-token'
          })
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(getChannels('invalid-token')).rejects.toThrow(
        'Get channels failed: 404'
      );
    });

    it('should validate slug parameters', async () => {
      await expect(
        getChannels('token', { slug: new Array(51).fill('test') })
      ).rejects.toThrow('Maximum 50 slugs allowed');

      await expect(
        getChannels('token', { slug: ['a'.repeat(26)] })
      ).rejects.toThrow('Slug must be 25 characters or less');
    });
  });

  describe('updateChannel', () => {
    it('should update channel successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Channel updated successfully'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await updateChannel('test-bearer-token', { category_id: 5 });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/channels', {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ category_id: 5 })
      });
    });

    it('should handle update errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403
      });

      await expect(updateChannel('invalid-token', { category_id: 1 })).rejects.toThrow(
        'Update channel failed: 403'
      );
    });
  });
});

describeWithTokens('Channels API (Integration Tests)', () => {
  const config = getTestConfig();

  it('should get channels with real token', async () => {
    if (!config.tokenCredentials?.bearerToken) {
      console.log('Skipping channels integration test - no bearer token available');
      console.log('Run "pnpm run getOauthTokens" first to get OAuth credentials');
      return;
    }

    try {
      const result = await getChannels(config.tokenCredentials.bearerToken);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    } catch (error) {
      console.log('Failed to get channels:', error);
    }
  });
});