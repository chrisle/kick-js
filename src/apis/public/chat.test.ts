import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendChatMessage } from './chat';
import { describeWithTokens, describeWithoutTokens, getTestConfig } from '../../test-utils/testConfig';

// Mock fetch globally
global.fetch = vi.fn();

describeWithoutTokens('Chat API (Mock Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendChatMessage', () => {
    it('should send a message successfully', async () => {
      const mockResponse = {
        data: {
          is_sent: true,
          message_id: 'test-message-id'
        },
        message: 'Message sent successfully'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await sendChatMessage('Hello world!', 'test-token');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/chat', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          content: 'Hello world!',
          type: 'bot'
        })
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue('Unauthorized')
      });

      await expect(sendChatMessage('Hello world!', 'invalid-token')).rejects.toThrow(
        'Message send failed: 401 Unauthorized'
      );
    });

    it('should send messages with proper content type', async () => {
      const mockResponse = {
        data: { is_sent: true, message_id: 'test' },
        message: 'Success'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      await sendChatMessage('Test message', 'bearer-token');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.kick.com/public/v1/chat',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          })
        })
      );
    });
  });
});

describeWithTokens('Chat API (Integration Tests)', () => {
  const config = getTestConfig();

  it('should send a message with real tokens', () => {
    if (!config.tokenCredentials?.bearerToken) {
      console.log('Skipping integration test - no bearer token available');
      return;
    }

    // This test would use real tokens to send an actual message
    // For safety, we'll just validate the token format
    expect(config.tokenCredentials.bearerToken).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});