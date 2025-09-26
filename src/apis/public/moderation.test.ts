import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { banUser, unbanUser } from './moderation';
import { describeWithTokens, describeWithoutTokens, getTestConfig } from '../../test-utils/testConfig';

// Mock fetch globally
global.fetch = vi.fn();

describeWithoutTokens('Moderation API (Mock Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('banUser', () => {
    it('should ban a user permanently', async () => {
      const mockResponse = {
        message: 'User banned successfully'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await banUser('test-bearer-token', 123, 456);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/moderation/bans', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          broadcaster_user_id: 123,
          user_id: 456
        })
      });
    });

    it('should ban a user temporarily with duration', async () => {
      const mockResponse = {
        message: 'User timed out successfully'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await banUser('test-bearer-token', 123, 456, 60, 'Test reason');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/moderation/bans', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          broadcaster_user_id: 123,
          user_id: 456,
          duration: 60,
          reason: 'Test reason'
        })
      });
    });

    it('should validate reason length', async () => {
      const longReason = 'A'.repeat(101);

      await expect(
        banUser('test-bearer-token', 123, 456, undefined, longReason)
      ).rejects.toThrow('Reason must be 100 characters or less');
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403
      });

      await expect(banUser('test-bearer-token', 123, 456)).rejects.toThrow(
        'Ban user failed: 403'
      );
    });
  });

  describe('unbanUser', () => {
    it('should unban a user successfully', async () => {
      const mockResponse = {
        message: 'User unbanned successfully'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await unbanUser('test-bearer-token', 123, 456);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/moderation/bans', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          broadcaster_user_id: 123,
          user_id: 456
        })
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(unbanUser('test-bearer-token', 123, 456)).rejects.toThrow(
        'Unban user failed: 404'
      );
    });
  });
});

describeWithTokens('Moderation API (Integration Tests)', () => {
  const config = getTestConfig();

  it('should validate credentials for moderation', () => {
    if (!config.tokenCredentials?.bearerToken) {
      console.log('Skipping moderation integration test - no bearer token available');
      console.log('Run "pnpm run getOauthTokens" first to get OAuth credentials');
      return;
    }

    // NOTE: We don't actually perform ban/unban operations in tests
    // as that would require special permissions and could affect real users
    expect(config.tokenCredentials.bearerToken).toBeDefined();
  });
});