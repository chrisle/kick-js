import { describe, it, expect } from "vitest";
import { validateCredentials, parseJSON } from "./utils.js";

describe("Utils", () => {
  describe("validateCredentials", () => {
    it("should validate login credentials successfully", () => {
      const validOptions = {
        type: "login" as const,
        credentials: {
          username: "testuser",
          password: "testpass",
          otp_secret: "testotp",
        },
      };

      expect(() => validateCredentials(validOptions)).not.toThrow();
    });

    it("should throw error for missing username", () => {
      const invalidOptions = {
        type: "login" as const,
        credentials: {
          username: "",
          password: "testpass",
          otp_secret: "testotp",
        },
      };

      expect(() => validateCredentials(invalidOptions)).toThrow(
        "Username is required and must be a string",
      );
    });

    it("should throw error for missing password", () => {
      const invalidOptions = {
        type: "login" as const,
        credentials: {
          username: "testuser",
          password: "",
          otp_secret: "testotp",
        },
      };

      expect(() => validateCredentials(invalidOptions)).toThrow(
        "Password is required and must be a string",
      );
    });

    it("should throw error for missing OTP secret", () => {
      const invalidOptions = {
        type: "login" as const,
        credentials: {
          username: "testuser",
          password: "testpass",
          otp_secret: "",
        },
      };

      expect(() => validateCredentials(invalidOptions)).toThrow(
        "OTP secret is required and must be a string",
      );
    });

    it("should validate token-based authentication", () => {
      const validTokenOptions = {
        type: "tokens" as const,
        credentials: {
          bearerToken: "test-bearer",
          xsrfToken: "test-xsrf",
          cookies: "test-cookies",
        },
      };

      expect(() => validateCredentials(validTokenOptions)).not.toThrow();
    });

    it("should throw error for missing bearer token", () => {
      const invalidOptions = {
        type: "tokens" as const,
        credentials: {
          bearerToken: "",
          xsrfToken: "test-xsrf",
          cookies: "test-cookies",
        },
      };

      expect(() => validateCredentials(invalidOptions)).toThrow(
        "bearerToken is required and must be a string",
      );
    });

    it("should throw error for missing xsrf token", () => {
      const invalidOptions = {
        type: "tokens" as const,
        credentials: {
          bearerToken: "test-bearer",
          xsrfToken: "",
          cookies: "test-cookies",
        },
      };

      expect(() => validateCredentials(invalidOptions)).toThrow(
        "xsrfToken is required and must be a string",
      );
    });

    it("should throw error for missing cookies", () => {
      const invalidOptions = {
        type: "tokens" as const,
        credentials: {
          bearerToken: "test-bearer",
          xsrfToken: "test-xsrf",
          cookies: "",
        },
      };

      expect(() => validateCredentials(invalidOptions)).toThrow(
        "cookies are required and must be a string",
      );
    });

    it("should throw error for invalid login type", () => {
      const invalidOptions = {
        type: "invalid",
        credentials: {},
      } as any;

      expect(() => validateCredentials(invalidOptions)).toThrow(
        "Invalid login type",
      );
    });

    it("should test parseJSON utility", () => {
      const testObj = { test: "value", number: 42 };
      const jsonString = JSON.stringify(testObj);

      expect(parseJSON(jsonString)).toEqual(testObj);
    });

    it("should allow OAuth type without strict validation", () => {
      const oauthOptions = {
        type: "oauth" as const,
        credentials: {
          accessToken: "test-token",
        },
      };

      expect(() => validateCredentials(oauthOptions)).not.toThrow();
    });

    it("should throw error when credentials are missing entirely", () => {
      const missingCredsOptions = {
        type: "login" as const,
      } as any;

      expect(() => validateCredentials(missingCredsOptions)).toThrow(
        "Credentials are required",
      );
    });
  });
});
