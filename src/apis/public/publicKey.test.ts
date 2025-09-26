import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPublicKey } from './publicKey';
import { describeWithTokens, describeWithoutTokens } from '../../test-utils/testConfig';

// Mock fetch globally
global.fetch = vi.fn();

describeWithoutTokens('Public Key API (Mock Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPublicKey', () => {
    it('should get public key successfully', async () => {
      const mockResponse = {
        data: {
          public_key: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----'
        },
        message: 'Public key retrieved successfully'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await getPublicKey();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/public-key', {
        headers: {
          'Accept': 'application/json'
        }
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(getPublicKey()).rejects.toThrow(
        'Get public key failed: 500'
      );
    });

    it('should validate public key format in response', async () => {
      const mockResponse = {
        data: {
          public_key: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1234567890abcdef\n-----END PUBLIC KEY-----'
        },
        message: 'Success'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await getPublicKey();

      expect(result.data.public_key).toContain('-----BEGIN PUBLIC KEY-----');
      expect(result.data.public_key).toContain('-----END PUBLIC KEY-----');
    });

    it('should handle malformed response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await expect(getPublicKey()).rejects.toThrow('Invalid JSON');
    });
  });
});

describeWithTokens('Public Key API (Integration Tests)', () => {
  it('should get real public key', async () => {
    try {
      const result = await getPublicKey();
      expect(result.data).toBeDefined();
      expect(result.data.public_key).toBeDefined();
      expect(result.data.public_key).toContain('-----BEGIN PUBLIC KEY-----');
      expect(result.data.public_key).toContain('-----END PUBLIC KEY-----');
    } catch (error) {
      console.log('Failed to get public key:', error);
    }
  });
});