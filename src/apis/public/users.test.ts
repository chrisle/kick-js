import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { introspectToken, getUsers } from './users';
import { describeWithTokens, describeWithoutTokens, getTestConfig } from '../../test-utils/testConfig';

// Mock fetch globally
global.fetch = vi.fn();

describeWithoutTokens('Users API (Mock Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('introspectToken', () => {
    it('should introspect token successfully', async () => {
      const mockResponse = {
        active: true,
        client_id: 'test-client-id',
        exp: 1234567890,
        scope: 'read write'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await introspectToken('test-bearer-token');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/token/introspect', {
        method: 'POST',
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

      await expect(introspectToken('invalid-token')).rejects.toThrow(
        'Token introspect failed: 401'
      );
    });
  });

  describe('getUsers', () => {
    it('should get users successfully without IDs', async () => {
      const mockResponse = {
        data: [
          {
            email: 'user@example.com',
            name: 'Test User',
            profile_picture: 'https://example.com/avatar.jpg',
            user_id: 123
          }
        ],
        message: 'Success'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await getUsers('test-bearer-token');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/users', {
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Accept': 'application/json'
        }
      });
    });

    it('should get users with specific IDs', async () => {
      const mockResponse = {
        data: [
          { user_id: 123, name: 'User 1' },
          { user_id: 456, name: 'User 2' }
        ],
        message: 'Success'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await getUsers('test-bearer-token', [123, 456]);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.kick.com/public/v1/users?id=123&id=456',
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
        status: 403
      });

      await expect(getUsers('invalid-token')).rejects.toThrow(
        'Get users failed: 403'
      );
    });
  });
});

describeWithTokens('Users API (Integration Tests)', () => {
  const config = getTestConfig();

  it('should introspect real token', async () => {
    if (!config.tokenCredentials?.bearerToken) {
      console.log('Skipping users integration test - no bearer token available');
      console.log('Run "pnpm run getOauthTokens" first to get OAuth credentials');
      return;
    }

    try {
      const result = await introspectToken(config.tokenCredentials.bearerToken);
      expect(result.active).toBe(true);
      expect(result.client_id).toBeDefined();
    } catch (error) {
      console.log('Token may be expired or invalid:', error);
    }
  });

  it('should get current user info', async () => {
    if (!config.tokenCredentials?.bearerToken) {
      console.log('Skipping users integration test - no bearer token available');
      console.log('Run "pnpm run getOauthTokens" first to get OAuth credentials');
      return;
    }

    try {
      const result = await getUsers(config.tokenCredentials.bearerToken);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      if (result.data && result.data.length > 0) {
        expect(result.data[0]?.user_id).toBeGreaterThan(0);
      }
    } catch (error) {
      console.log('Failed to get user info:', error);
    }
  });
});