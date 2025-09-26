import { config } from "dotenv";
import { describe } from "vitest";

config({ quiet: true });

export interface TestConfig {
  useRealTokens: boolean;
  credentials?: {
    username: string;
    password: string;
    email?: string;
    otp_secret?: string;
  };
  tokenCredentials?: {
    bearerToken: string;
    xsrfToken: string;
    cookies: string;
  };
  testChannel: string;
  testVideoId?: string;
  testChatChannel?: string;
  timeout: number;
  headless: boolean;
}

export function getTestConfig(): TestConfig {
  // Check if we should run integration tests (with real tokens) based on environment variable
  // Default to false (unit tests with mocks)
  const useRealTokens = process.env.INTEGRATION_TEST === "true";

  // Check if we should run tests in headless mode (default to true)
  // Only set to false if explicitly requested for debugging
  const headless = process.env.HEADLESS !== "false";

  // Get test channel (default to a known channel if not specified)
  const testChannel = process.env.KICK_CHANNEL || "xqc";

  if (!useRealTokens) {
    return {
      useRealTokens: false,
      testChannel,
      testVideoId: process.env.KICK_TEST_VIDEO_ID,
      testChatChannel: process.env.KICK_TEST_CHAT_CHANNEL,
      timeout: 30000,
      headless,
    };
  }

  // When using real tokens, get credentials from environment
  const username = process.env.KICK_USERNAME;
  const password = process.env.KICK_PASSWORD;
  const email = process.env.KICK_EMAIL;
  const otp_secret = process.env.KICK_OTP;

  // Browser captured tokens
  const bearerToken = process.env.KICK_BEARER_TOKEN;
  const xsrfToken = process.env.KICK_XSRF_TOKEN;
  const cookies = process.env.KICK_COOKIES;

  const config: TestConfig = {
    useRealTokens: true,
    testChannel,
    testVideoId: process.env.KICK_TEST_VIDEO_ID,
    testChatChannel: process.env.KICK_TEST_CHAT_CHANNEL,
    timeout: 60000, // Longer timeout for real API calls
    headless,
  };

  // Add login credentials if available
  if (username && password) {
    config.credentials = {
      username,
      password,
      email,
      otp_secret,
    };
  }

  // Add browser captured tokens if available
  if (bearerToken && xsrfToken && cookies) {
    config.tokenCredentials = {
      bearerToken,
      xsrfToken,
      cookies,
    };
  }

  return config;
}

export function skipIfNoTokens() {
  const config = getTestConfig();
  if (!config.useRealTokens) {
    return true;
  }
  return false;
}

// Helper functions for checking available authentication methods
export function hasLoginCredentials(): boolean {
  const config = getTestConfig();
  return !!config.credentials;
}

export function hasTokenCredentials(): boolean {
  const config = getTestConfig();
  return !!config.tokenCredentials;
}

export function getAvailableAuthMethods(): string[] {
  const methods: string[] = [];
  if (hasLoginCredentials()) methods.push("login");
  if (hasTokenCredentials()) methods.push("tokens");
  return methods;
}

// Conditional describe functions for different test scenarios
export function describeWithTokens(name: string, fn: () => void) {
  const config = getTestConfig();
  if (config.useRealTokens) {
    describe(name, fn);
  } else {
    describe.skip(name + " (skipped - no tokens)", fn);
  }
}

export function describeWithoutTokens(name: string, fn: () => void) {
  const config = getTestConfig();
  if (!config.useRealTokens) {
    describe(name, fn);
  } else {
    describe.skip(name + " (skipped - using real tokens)", fn);
  }
}
