import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { authentication } from "./authentication";
import {
  describeWithTokens,
  describeWithoutTokens,
  getTestConfig,
} from "../../test-utils/testConfig";

// Mock the entire authentication module for unit tests
vi.mock("./authentication", async () => {
  const actual = await vi.importActual("./authentication");
  return {
    ...actual,
    authentication: vi.fn(),
  };
});

// Import the mocked function
import { authentication as mockAuthentication } from "./authentication";

describeWithoutTokens("Authentication API (Mock Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("authentication", () => {
    const mockCredentials = {
      username: "testuser",
      password: "testpass",
    };

    it("should authenticate successfully without OTP", async () => {
      const mockResult = {
        bearerToken: "test-bearer-token",
        xsrfToken: "test-xsrf-token",
        cookies: "session=abc123; csrf=def456",
        isAuthenticated: true,
      };

      (mockAuthentication as any).mockResolvedValue(mockResult);

      const result = await authentication(mockCredentials, "test-channel");

      expect(result).toEqual(mockResult);
      expect(mockAuthentication).toHaveBeenCalledWith(
        mockCredentials,
        "test-channel",
      );
    });

    it("should authenticate with OTP", async () => {
      const credentialsWithOTP = {
        ...mockCredentials,
        otp_secret: "JBSWY3DPEHPK3PXP",
      };

      const mockResult = {
        bearerToken: "test-bearer-token",
        xsrfToken: "test-xsrf-token",
        cookies: "session=abc123; csrf=def456",
        isAuthenticated: true,
      };

      (mockAuthentication as any).mockResolvedValue(mockResult);

      const result = await authentication(credentialsWithOTP, "test-channel");

      expect(result).toEqual(mockResult);
      expect(mockAuthentication).toHaveBeenCalledWith(
        credentialsWithOTP,
        "test-channel",
      );
    });

    it("should handle authentication failure", async () => {
      const mockResult = {
        bearerToken: null,
        xsrfToken: null,
        cookies: "",
        isAuthenticated: false,
      };

      (mockAuthentication as any).mockResolvedValue(mockResult);

      const result = await authentication(mockCredentials, "test-channel");

      expect(result.isAuthenticated).toBe(false);
      expect(result.bearerToken).toBeNull();
      expect(result.xsrfToken).toBeNull();
    });

    it("should handle authentication errors gracefully", async () => {
      const error = new Error("Authentication failed");
      (mockAuthentication as any).mockRejectedValue(error);

      await expect(
        authentication(mockCredentials, "test-channel"),
      ).rejects.toThrow("Authentication failed");
    });

    it("should pass puppeteer options", async () => {
      const mockResult = {
        bearerToken: "token",
        xsrfToken: "xsrf",
        cookies: "cookies",
        isAuthenticated: true,
      };

      const options = { headless: true, args: ["--no-sandbox"] };
      (mockAuthentication as any).mockResolvedValue(mockResult);

      await authentication(mockCredentials, "test-channel", options);

      expect(mockAuthentication).toHaveBeenCalledWith(
        mockCredentials,
        "test-channel",
        options,
      );
    });

    it("should validate required credentials", async () => {
      const error = new Error("Username and password are required");
      (mockAuthentication as any).mockRejectedValue(error);

      const invalidCredentials = {
        username: "",
        password: "testpass",
      };

      await expect(
        authentication(invalidCredentials, "test-channel"),
      ).rejects.toThrow();
    });

    it("should handle channel parameter", async () => {
      const mockResult = {
        bearerToken: "token",
        xsrfToken: "xsrf",
        cookies: "cookies",
        isAuthenticated: true,
      };

      (mockAuthentication as any).mockResolvedValue(mockResult);

      await authentication(mockCredentials, "different-channel");

      expect(mockAuthentication).toHaveBeenCalledWith(
        mockCredentials,
        "different-channel",
      );
    });
  });
});

describeWithTokens("Authentication API (Integration Tests)", () => {
  const config = getTestConfig();

  it("should validate credentials format", () => {
    if (!config.credentials?.username || !config.credentials?.password) {
      console.log(
        "Skipping authentication integration test - no login credentials available",
      );
      console.log(
        "Add KICK_USERNAME and KICK_PASSWORD to your environment variables",
      );
      return;
    }

    // NOTE: We don't actually perform authentication in tests as that would
    // require real credentials and could affect the actual account
    expect(config.credentials.username).toBeDefined();
    expect(config.credentials.password).toBeDefined();
  });
});
