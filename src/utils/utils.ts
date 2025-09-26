import type {
  LoginOptions,
  LoginCredentials,
  TokenCredentials,
} from "../types/client";

/**
 * Parse JSON string with type safety
 * @param json - JSON string to parse
 * @returns Parsed object with specified type
 */
export const parseJSON = <T>(json: string): T => JSON.parse(json) as T;

/**
 * Validates login credentials based on the login type
 * @param options - The login options to validate
 */
export const validateCredentials = (options: LoginOptions) => {
  const { type } = options;
  const credentials =
    "credentials" in options ? options.credentials : undefined;

  if (!credentials) {
    throw new Error("Credentials are required");
  }

  switch (type) {
    case "login": {
      const loginCreds = credentials as LoginCredentials;
      if (!loginCreds.username || typeof loginCreds.username !== "string") {
        throw new Error("Username is required and must be a string");
      }
      if (!loginCreds.password || typeof loginCreds.password !== "string") {
        throw new Error("Password is required and must be a string");
      }
      if (!loginCreds.otp_secret || typeof loginCreds.otp_secret !== "string") {
        throw new Error("OTP secret is required and must be a string");
      }
      break;
    }
    case "tokens": {
      const tokenCreds = credentials as TokenCredentials;
      if (
        !tokenCreds.bearerToken ||
        typeof tokenCreds.bearerToken !== "string"
      ) {
        throw new Error("bearerToken is required and must be a string");
      }
      if (!tokenCreds.xsrfToken || typeof tokenCreds.xsrfToken !== "string") {
        throw new Error("xsrfToken is required and must be a string");
      }
      if (!tokenCreds.cookies || typeof tokenCreds.cookies !== "string") {
        throw new Error("cookies are required and must be a string");
      }
      break;
    }
    case "oauth":
      // OAuth credentials validation is handled by the authentication functions
      break;

    default:
      throw new Error("Invalid login type");
  }
};
