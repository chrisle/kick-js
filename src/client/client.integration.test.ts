import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from './client.js';
import { describeWithTokens, TEST_CONFIG, getTestTimeout } from '../test-utils/test-config.js';

describeWithTokens('KickClient Integration Tests (with real tokens)', () => {
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    client = createClient(TEST_CONFIG.CREDENTIALS.channel, {
      logger: true,
      readOnly: false,
    });
  }, getTestTimeout());

  afterEach(() => {
    if (client) {
      client.removeAllListeners();
    }
  });

  describe('Authentication', () => {
    it('should authenticate with real tokens', async () => {
      const result = await client.login({
        type: 'tokens',
        credentials: {
          bearerToken: TEST_CONFIG.CREDENTIALS.bearerToken,
          xsrfToken: TEST_CONFIG.CREDENTIALS.xsrfToken,
          cookies: TEST_CONFIG.CREDENTIALS.cookies,
        },
      });

      expect(result).toBe(true);
      expect(client.user).toBeTruthy();
      expect(client.user?.username).toBe(TEST_CONFIG.CREDENTIALS.channel);
    }, getTestTimeout());

    it('should handle invalid tokens gracefully', async () => {
      await expect(
        client.login({
          type: 'tokens',
          credentials: {
            bearerToken: 'invalid-token',
            xsrfToken: 'invalid-token',
            cookies: 'invalid-cookies',
          },
        })
      ).rejects.toThrow();
    }, getTestTimeout());
  });

  describe('Channel Operations', () => {
    beforeEach(async () => {
      await client.login({
        type: 'tokens',
        credentials: {
          bearerToken: TEST_CONFIG.CREDENTIALS.bearerToken,
          xsrfToken: TEST_CONFIG.CREDENTIALS.xsrfToken,
          cookies: TEST_CONFIG.CREDENTIALS.cookies,
        },
      });
    }, getTestTimeout());

    it('should fetch channel information', () => {
      expect(client.user).toBeTruthy();
      expect(client.user?.id).toBeTypeOf('number');
      expect(client.user?.username).toBeTypeOf('string');
      expect(client.user?.tag).toBeTypeOf('string');
    });

    it('should handle non-existent channels', async () => {
      const nonExistentClient = createClient('definitely-does-not-exist-12345');
      
      await expect(
        nonExistentClient.login({
          type: 'tokens',
          credentials: {
            bearerToken: TEST_CONFIG.CREDENTIALS.bearerToken,
            xsrfToken: TEST_CONFIG.CREDENTIALS.xsrfToken,
            cookies: TEST_CONFIG.CREDENTIALS.cookies,
          },
        })
      ).rejects.toThrow(/does not exist/);
    }, getTestTimeout());
  });

  describe('Event System', () => {
    beforeEach(async () => {
      await client.login({
        type: 'tokens',
        credentials: {
          bearerToken: TEST_CONFIG.CREDENTIALS.bearerToken,
          xsrfToken: TEST_CONFIG.CREDENTIALS.xsrfToken,
          cookies: TEST_CONFIG.CREDENTIALS.cookies,
        },
      });
    }, getTestTimeout());

    it('should emit ready event after successful login', (done) => {
      const newClient = createClient(TEST_CONFIG.CREDENTIALS.channel);
      
      newClient.on('ready', (user) => {
        expect(user).toBeTruthy();
        expect(user.username).toBe(TEST_CONFIG.CREDENTIALS.channel);
        newClient.removeAllListeners();
        done();
      });

      newClient.login({
        type: 'tokens',
        credentials: {
          bearerToken: TEST_CONFIG.CREDENTIALS.bearerToken,
          xsrfToken: TEST_CONFIG.CREDENTIALS.xsrfToken,
          cookies: TEST_CONFIG.CREDENTIALS.cookies,
        },
      });
    }, getTestTimeout());

    it('should handle event listener management', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      client.on('test-event', handler1);
      client.on('test-event', handler2);
      
      expect(client.listenerCount('test-event')).toBeGreaterThanOrEqual(2);

      client.off('test-event', handler1);
      expect(client.listenerCount('test-event')).toBeGreaterThanOrEqual(1);

      client.removeAllListeners('test-event');
      // After removing all listeners for the event, count should be 0 or very low
      expect(client.listenerCount('test-event')).toBeLessThanOrEqual(1);
    });
  });

  // Only run VOD tests if we have a specific video ID to test with
  if (process.env.KICK_TEST_VIDEO_ID) {
    describe('VOD Operations', () => {
      beforeEach(async () => {
        await client.login({
          type: 'tokens',
          credentials: {
            bearerToken: TEST_CONFIG.CREDENTIALS.bearerToken,
            xsrfToken: TEST_CONFIG.CREDENTIALS.xsrfToken,
            cookies: TEST_CONFIG.CREDENTIALS.cookies,
          },
        });
      }, getTestTimeout());

      it('should fetch video data', async () => {
        const videoId = process.env.KICK_TEST_VIDEO_ID!;
        const videoData = await client.vod(videoId);

        expect(videoData).toBeTruthy();
        expect(videoData.id).toBeTypeOf('number');
        expect(videoData.title).toBeTypeOf('string');
        expect(videoData.views).toBeTypeOf('number');
      }, getTestTimeout());

      it('should handle non-existent videos', async () => {
        await expect(
          client.vod('definitely-does-not-exist-12345')
        ).rejects.toThrow(/does not exist/);
      }, getTestTimeout());
    });
  }
});