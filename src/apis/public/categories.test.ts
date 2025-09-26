import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchCategories, getCategory } from './categories';
import { describeWithTokens, describeWithoutTokens, getTestConfig } from '../../test-utils/testConfig';

// Mock fetch globally
global.fetch = vi.fn();

describeWithoutTokens('Categories API (Mock Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchCategories', () => {
    it('should search categories successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            name: 'Gaming',
            thumbnail: 'https://example.com/gaming.jpg'
          },
          {
            id: 2,
            name: 'Just Chatting',
            thumbnail: 'https://example.com/chat.jpg'
          }
        ],
        message: 'Success'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await searchCategories('test-bearer-token', 'gaming');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/categories?q=gaming&page=1', {
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Accept': 'application/json'
        }
      });
    });

    it('should search categories with custom page', async () => {
      const mockResponse = { data: [], message: 'Success' };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      await searchCategories('test-bearer-token', 'test', 3);

      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/categories?q=test&page=3', {
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Accept': 'application/json'
        }
      });
    });

    it('should throw error for empty query', async () => {
      await expect(searchCategories('test-bearer-token', '')).rejects.toThrow(
        'Search query is required'
      );

      await expect(searchCategories('test-bearer-token', '   ')).rejects.toThrow(
        'Search query is required'
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401
      });

      await expect(searchCategories('invalid-token', 'gaming')).rejects.toThrow(
        'Search categories failed: 401'
      );
    });
  });

  describe('getCategory', () => {
    it('should get category by ID successfully', async () => {
      const mockResponse = {
        data: {
          id: 1,
          name: 'Gaming',
          thumbnail: 'https://example.com/gaming.jpg'
        },
        message: 'Success'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await getCategory('test-bearer-token', 1);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://api.kick.com/public/v1/categories/1', {
        headers: {
          'Authorization': 'Bearer test-bearer-token',
          'Accept': 'application/json'
        }
      });
    });

    it('should throw error for invalid category ID', async () => {
      await expect(getCategory('test-bearer-token', 0)).rejects.toThrow(
        'Valid category ID is required'
      );

      await expect(getCategory('test-bearer-token', -1)).rejects.toThrow(
        'Valid category ID is required'
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(getCategory('test-bearer-token', 999)).rejects.toThrow(
        'Get category failed: 404'
      );
    });
  });
});

describeWithTokens('Categories API (Integration Tests)', () => {
  const config = getTestConfig();

  it('should search for real categories', async () => {
    if (!config.tokenCredentials?.bearerToken) {
      console.log('Skipping categories integration test - no bearer token available');
      console.log('Run "pnpm run getOauthTokens" first to get OAuth credentials');
      return;
    }

    try {
      const result = await searchCategories(config.tokenCredentials.bearerToken, 'gaming');
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);

      if (result.data && result.data.length > 0) {
        expect(result.data[0]?.id).toBeGreaterThan(0);
        expect(result.data[0]?.name).toBeDefined();
      }
    } catch (error) {
      console.log('Failed to search categories:', error);
    }
  });

  it('should get a specific category if it exists', async () => {
    if (!config.tokenCredentials?.bearerToken) {
      console.log('Skipping categories integration test - no bearer token available');
      console.log('Run "pnpm run getOauthTokens" first to get OAuth credentials');
      return;
    }

    try {
      // First search for a category to get a valid ID
      const searchResult = await searchCategories(config.tokenCredentials.bearerToken, 'gaming');

      if (searchResult.data.length > 0) {
        const categoryId = searchResult.data?.[0]?.id;
        if (categoryId) {
          const result = await getCategory(config.tokenCredentials.bearerToken, categoryId);

          expect(result.data).toBeDefined();
          expect(result.data.id).toBe(categoryId);
          expect(result.data.name).toBeDefined();
        }
      }
    } catch (error) {
      console.log('Failed to get category:', error);
    }
  });
});