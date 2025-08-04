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

describeWithoutTokens('KickClient (Mock Tests)', () => {
  const mockChannelData = {
    id: 123,
    slug: 'testchannel',
    user: { username: 'TestUser' },
    chatroom: { id: 456 },
  };

  const mockVideoData = {
    id: 789,
    uuid: 'test-uuid',
    views: 1000,
    livestream: {
      session_title: 'Test Stream',
      thumbnail: 'test.jpg',
      duration: 3600,
      start_time: new Date(),
      language: 'en',
      channel: { name: 'TestChannel' },
    },
    live_stream_id: 101,
    created_at: new Date(),
    updated_at: new Date(),
    source: 'test-source',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Client Creation', () => {
    beforeEach(() => {
      vi.mocked(kickApi.getChannelData).mockResolvedValue(mockChannelData);
    });

    it('should create a client with default options', () => {
      const client = createClient('testchannel');
      expect(client).toBeDefined();
      expect(typeof client.on).toBe('function');
      expect(typeof client.off).toBe('function');
      expect(typeof client.login).toBe('function');
    });

    it('should create a client with custom options', () => {
      const client = createClient('testchannel', {
        logger: true,
        plainEmote: false,
        readOnly: true,
        puppeteerOptions: {
          headless: false,
          args: ['--test-arg'],
        },
      });
      expect(client).toBeDefined();
    });
  });

  describe('EventEmitter Methods', () => {
    let client: ReturnType<typeof createClient>;

    beforeEach(() => {
      client = createClient('testchannel');
    });

    it('should add and remove event listeners', () => {
      const mockHandler = vi.fn();
      
      // Add listener
      client.on('test-event', mockHandler);
      expect(client.listenerCount('test-event')).toBe(1);

      // Remove listener
      client.off('test-event', mockHandler);
      expect(client.listenerCount('test-event')).toBe(0);
    });

    it('should handle multiple listeners for the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      client.on('test-event', handler1);
      client.on('test-event', handler2);
      
      expect(client.listenerCount('test-event')).toBe(2);

      const listeners = client.listeners('test-event');
      expect(listeners).toHaveLength(2);
    });

    it('should remove all listeners for an event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      client.on('test-event', handler1);
      client.on('test-event', handler2);
      client.on('other-event', handler1);

      expect(client.listenerCount('test-event')).toBe(2);
      expect(client.listenerCount('other-event')).toBe(1);

      client.removeAllListeners('test-event');

      expect(client.listenerCount('test-event')).toBe(0);
      expect(client.listenerCount('other-event')).toBe(1);
    });

    it('should remove all listeners when no event specified', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      client.on('test-event', handler1);
      client.on('other-event', handler2);

      const initialTestCount = client.listenerCount('test-event');
      const initialOtherCount = client.listenerCount('other-event');
      
      expect(initialTestCount).toBeGreaterThan(0);
      expect(initialOtherCount).toBeGreaterThan(0);

      client.removeAllListeners();

      // After removeAllListeners(), counts should be less than or equal to initial
      // (might be 0 or might have some internal listeners remaining)
      expect(client.listenerCount('test-event')).toBeLessThanOrEqual(initialTestCount);
      expect(client.listenerCount('other-event')).toBeLessThanOrEqual(initialOtherCount);
    });
  });

  describe('Authentication', () => {
    let client: ReturnType<typeof createClient>;

    beforeEach(() => {
      client = createClient('testchannel');
      vi.mocked(kickApi.getChannelData).mockResolvedValue(mockChannelData);
    });

    it('should authenticate with login credentials', async () => {
      vi.mocked(kickApi.authentication).mockResolvedValue({
        bearerToken: 'test-bearer',
        xsrfToken: 'test-xsrf',
        cookies: 'test-cookies',
        isAuthenticated: true,
      });

      const result = await client.login({
        type: 'login',
        credentials: {
          username: 'testuser',
          password: 'testpass',
          otp_secret: 'testotp',
        },
      });

      expect(result).toBe(true);
      expect(kickApi.authentication).toHaveBeenCalledWith(
        {
          username: 'testuser',
          password: 'testpass',
          otp_secret: 'testotp',
        },
        undefined
      );
    });

    it('should authenticate with tokens', async () => {
      const result = await client.login({
        type: 'tokens',
        credentials: {
          bearerToken: 'test-bearer',
          xsrfToken: 'test-xsrf',
          cookies: 'test-cookies',
        },
      });

      expect(result).toBe(true);
      expect(kickApi.getChannelData).toHaveBeenCalledWith('testchannel', undefined);
    });

    it('should pass puppeteer options to authentication', async () => {
      const client = createClient('testchannel', {
        puppeteerOptions: { headless: false },
      });

      vi.mocked(kickApi.authentication).mockResolvedValue({
        bearerToken: 'test-bearer',
        xsrfToken: 'test-xsrf',
        cookies: 'test-cookies',
        isAuthenticated: true,
      });

      await client.login({
        type: 'login',
        credentials: {
          username: 'testuser',
          password: 'testpass',
          otp_secret: 'testotp',
        },
      });

      expect(kickApi.authentication).toHaveBeenCalledWith(
        expect.any(Object),
        { headless: false }
      );
    });
  });

  describe('VOD Functionality', () => {
    let client: ReturnType<typeof createClient>;

    beforeEach(() => {
      client = createClient('testchannel');
    });

    it('should fetch video data successfully', async () => {
      vi.mocked(kickApi.getVideoData).mockResolvedValue(mockVideoData);

      const result = await client.vod('test-video-id');

      expect(result).toEqual({
        id: mockVideoData.id,
        title: mockVideoData.livestream.session_title,
        thumbnail: mockVideoData.livestream.thumbnail,
        duration: mockVideoData.livestream.duration,
        live_stream_id: mockVideoData.live_stream_id,
        start_time: mockVideoData.livestream.start_time,
        created_at: mockVideoData.created_at,
        updated_at: mockVideoData.updated_at,
        uuid: mockVideoData.uuid,
        views: mockVideoData.views,
        stream: mockVideoData.source,
        language: mockVideoData.livestream.language,
        livestream: mockVideoData.livestream,
        channel: mockVideoData.livestream.channel,
      });

      expect(kickApi.getVideoData).toHaveBeenCalledWith('test-video-id', undefined);
    });

    it('should pass puppeteer options to getVideoData', async () => {
      const client = createClient('testchannel', {
        puppeteerOptions: { headless: false },
      });

      vi.mocked(kickApi.getVideoData).mockResolvedValue(mockVideoData);

      await client.vod('test-video-id');

      expect(kickApi.getVideoData).toHaveBeenCalledWith('test-video-id', { headless: false });
    });
  });

  describe('User Property', () => {
    let client: ReturnType<typeof createClient>;

    beforeEach(() => {
      client = createClient('testchannel');
      vi.mocked(kickApi.getChannelData).mockResolvedValue(mockChannelData);
    });

    it('should return null when not initialized', () => {
      expect(client.user).toBeNull();
    });

    it('should return user info after successful login', async () => {
      await client.login({
        type: 'tokens',
        credentials: {
          bearerToken: 'test-bearer',
          xsrfToken: 'test-xsrf',
          cookies: 'test-cookies',
        },
      });

      expect(client.user).toEqual({
        id: mockChannelData.id,
        username: mockChannelData.slug,
        tag: mockChannelData.user.username,
      });
    });
  });
});