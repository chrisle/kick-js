/**
 * Test configuration utilities
 */
import { describe } from 'vitest';

export const TEST_CONFIG = {
  // Check if we should run tests with real tokens
  WITH_TOKENS: process.env.TEST_WITH_TOKENS === 'true',
  
  // Test credentials from environment
  CREDENTIALS: {
    bearerToken: process.env.KICK_BEARER_TOKEN || 'mock-bearer-token',
    xsrfToken: process.env.KICK_XSRF_TOKEN || 'mock-xsrf-token',
    cookies: process.env.KICK_COOKIES || 'mock-cookies',
    channel: process.env.KICK_CHANNEL || 'test-channel',
  },
  
  // Test timeouts
  TIMEOUTS: {
    standard: 5000,
    withTokens: 30000, // Longer timeout for real API calls
  }
};

/**
 * Helper to conditionally skip tests based on token availability
 */
export const describeWithTokens = TEST_CONFIG.WITH_TOKENS 
  ? describe 
  : describe.skip;
  
export const describeWithoutTokens = !TEST_CONFIG.WITH_TOKENS 
  ? describe 
  : describe.skip;

/**
 * Helper to get appropriate timeout for test type
 */
export const getTestTimeout = () => 
  TEST_CONFIG.WITH_TOKENS ? TEST_CONFIG.TIMEOUTS.withTokens : TEST_CONFIG.TIMEOUTS.standard;