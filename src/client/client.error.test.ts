import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from './client.js';
import * as kickApi from '../core/kickApi.js';
import { describeWithoutTokens } from '../test-utils/test-config.js';

// Mock the kickApi module
vi.mock('../core/kickApi.js', () => ({
  getChannelData: vi.fn(),
  getVideoData: vi.fn(),
  authentication: vi.fn(),
}));

// Mock WebSocket
vi.mock('../core/websocket.js', () => ({
  createWebSocket: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn(),
  })),
}));

describeWithoutTokens('KickClient Error Handling (Mock Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Channel Not Found Errors', () => {
    it('should handle channel not found during login with credentials', async () => {
      const client = createClient('nonexistent-channel');

      vi.mocked(kickApi.authentication).mockResolvedValue({
        bearerToken: 'test-bearer',
        xsrfToken: 'test-xsrf',
        cookies: 'test-cookies',
        isAuthenticated: true,
      });

      vi.mocked(kickApi.getChannelData).mockRejectedValue(
        new Error("Channel 'nonexistent-channel' does not exist on Kick.com")
      );

      await expect(
        client.login({
          type: 'login',
          credentials: {
            username: 'testuser',
            password: 'testpass',
            otp_secret: 'testotp',
          },
        })
      ).rejects.toThrow("Channel 'nonexistent-channel' does not exist on Kick.com");
    });

    it('should handle channel not found during login with tokens', async () => {
      const client = createClient('nonexistent-channel');

      vi.mocked(kickApi.getChannelData).mockRejectedValue(
        new Error("Channel 'nonexistent-channel' does not exist on Kick.com")
      );

      await expect(
        client.login({
          type: 'tokens',
          credentials: {
            bearerToken: 'test-bearer',
            xsrfToken: 'test-xsrf',
            cookies: 'test-cookies',
          },
        })
      ).rejects.toThrow("Channel 'nonexistent-channel' does not exist on Kick.com");
    });

    it('should handle channel data returning null', async () => {
      const client = createClient('test-channel');

      vi.mocked(kickApi.getChannelData).mockResolvedValue(null);

      await expect(
        client.login({
          type: 'tokens',
          credentials: {
            bearerToken: 'test-bearer',
            xsrfToken: 'test-xsrf',
            cookies: 'test-cookies',
          },
        })
      ).rejects.toThrow("Unable to fetch channel data for 'test-channel'");
    });

    it('should handle read-only mode initialization', () => {
      vi.mocked(kickApi.getChannelData).mockResolvedValue({
        id: 123,
        slug: 'testchannel',
        user: { username: 'TestUser' },
        chatroom: { id: 456 },
      });

      expect(() => {
        createClient('testchannel', { readOnly: true });
      }).not.toThrow(); // Should not throw for valid channel
    });
  });

  describe('Video Not Found Errors', () => {
    let client: ReturnType<typeof createClient>;

    beforeEach(() => {
      client = createClient('testchannel');
    });

    it('should handle video not found error', async () => {
      vi.mocked(kickApi.getVideoData).mockRejectedValue(
        new Error("Video 'nonexistent-video' does not exist or has been removed from Kick.com")
      );

      await expect(client.vod('nonexistent-video')).rejects.toThrow(
        "Video 'nonexistent-video' does not exist or has been removed from Kick.com"
      );
    });

    it('should handle video data returning null', async () => {
      vi.mocked(kickApi.getVideoData).mockResolvedValue(null);

      await expect(client.vod('test-video')).rejects.toThrow(
        "Unable to fetch video data for 'test-video'"
      );
    });

    it('should handle other video errors gracefully', async () => {
      vi.mocked(kickApi.getVideoData).mockRejectedValue(
        new Error('Network error')
      );

      await expect(client.vod('test-video')).rejects.toThrow('Network error');
    });
  });

  describe('Authentication Errors', () => {
    it('should handle authentication failure', async () => {
      const client = createClient('testchannel');

      vi.mocked(kickApi.authentication).mockResolvedValue({
        bearerToken: '',
        xsrfToken: '',
        cookies: '',
        isAuthenticated: false,
      });

      await expect(
        client.login({
          type: 'login',
          credentials: {
            username: 'testuser',
            password: 'wrongpass',
            otp_secret: 'testotp',
          },
        })
      ).rejects.toThrow('Authentication failed');
    });

    it('should handle missing credentials for login type', async () => {
      const client = createClient('testchannel');

      await expect(
        client.login({
          type: 'login',
          credentials: undefined as any,
        })
      ).rejects.toThrow('Credentials are required for login');
    });

    it('should handle missing tokens for tokens type', async () => {
      const client = createClient('testchannel');

      await expect(
        client.login({
          type: 'tokens',
          credentials: undefined as any,
        })
      ).rejects.toThrow('Tokens are required for login');
    });

    it('should handle missing OTP secret error', async () => {
      const client = createClient('testchannel');

      await expect(
        client.login({
          type: 'login',
          credentials: {
            username: 'testuser',
            password: 'testpass',
            otp_secret: '',
          },
        })
      ).rejects.toThrow('OTP secret is required and must be a string');
    });

    it('should handle Cloudflare protection error', async () => {
      const client = createClient('testchannel');

      vi.mocked(kickApi.authentication).mockRejectedValue(
        new Error('Request blocked by Cloudflare protection')
      );

      await expect(
        client.login({
          type: 'login',
          credentials: {
            username: 'testuser',
            password: 'testpass',
            otp_secret: 'testotp',
          },
        })
      ).rejects.toThrow('Request blocked by Cloudflare protection');
    });
  });

  describe('Moderation Action Errors', () => {
    let client: ReturnType<typeof createClient>;

    beforeEach(() => {
      client = createClient('testchannel');
    });

    it('should throw error when trying to ban without authentication', async () => {
      await expect(client.banUser('testuser')).rejects.toThrow(
        'Channel info not available'
      );
    });

    it('should throw error when trying to unban without authentication', async () => {
      await expect(client.unbanUser('testuser')).rejects.toThrow(
        'Channel info not available'
      );
    });

    it('should throw error when trying to delete message without authentication', async () => {
      await expect(client.deleteMessage('12345')).rejects.toThrow(
        'Channel info not available'
      );
    });

    it('should throw error when trying to set slow mode without authentication', async () => {
      await expect(client.slowMode('on', 30)).rejects.toThrow(
        'Channel info not available'
      );
    });

    it('should throw error when trying to send message without authentication', async () => {
      await expect(client.sendMessage('Hello')).rejects.toThrow(
        'Channel info not available'
      );
    });
  });

  describe('Input Validation Errors', () => {
    let client: ReturnType<typeof createClient>;

    beforeEach(() => {
      client = createClient('testchannel');
      // Mock successful authentication setup
      vi.mocked(kickApi.getChannelData).mockResolvedValue({
        id: 123,
        slug: 'testchannel',
        user: { username: 'TestUser' },
        chatroom: { id: 456 },
      });
    });

    it('should handle message too long error', async () => {
      await client.login({
        type: 'tokens',
        credentials: {
          bearerToken: 'test-bearer',
          xsrfToken: 'test-xsrf',
          cookies: 'test-cookies',
        },
      });

      const longMessage = 'a'.repeat(501);
      await expect(client.sendMessage(longMessage)).rejects.toThrow(
        'Message content must be less than 500 characters'
      );
    });
  });
});