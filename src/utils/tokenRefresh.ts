import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

interface RefreshTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Refresh OAuth access token using refresh token
 * @param clientId - OAuth client ID
 * @param clientSecret - OAuth client secret
 * @param refreshToken - Current refresh token
 * @returns Promise resolving to new token data
 */
export async function refreshOAuthToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<RefreshTokenResponse> {
  const tokenData = {
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  };

  const response = await fetch("https://id.kick.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(tokenData).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as RefreshTokenResponse;
}

/**
 * Update .env file with new OAuth tokens
 * @param tokens - New token data
 * @param envPath - Path to .env file (defaults to project root)
 */
export function updateEnvTokens(
  tokens: RefreshTokenResponse,
  envPath?: string,
): void {
  const targetPath = envPath || join(process.cwd(), ".env");

  let envContent = "";
  if (existsSync(targetPath)) {
    envContent = readFileSync(targetPath, "utf8");
  }

  // Parse existing env content
  const envLines = envContent.split("\n");
  const envVars = new Map<string, string>();

  envLines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        envVars.set(key, valueParts.join("="));
      }
    }
  });

  // Update with new token values
  envVars.set("KICK_ACCESS_TOKEN", tokens.access_token);
  envVars.set("KICK_TOKEN_TYPE", tokens.token_type);
  envVars.set("KICK_EXPIRES_IN", tokens.expires_in.toString());
  envVars.set("KICK_SCOPE", tokens.scope);

  if (tokens.refresh_token) {
    envVars.set("KICK_REFRESH_TOKEN", tokens.refresh_token);
  }

  // Add timestamp for reference
  envVars.set("KICK_TOKEN_UPDATED", new Date().toISOString());

  // Build new env content, preserving comments
  const newEnvLines: string[] = [];

  // Add all variables
  envVars.forEach((value, key) => {
    newEnvLines.push(`${key}=${value}`);
  });

  // Write back to file
  writeFileSync(targetPath, newEnvLines.join("\n") + "\n");
}

/**
 * Check if token is expired or about to expire
 * @param tokenUpdated - ISO timestamp when token was last updated
 * @param expiresIn - Token expiration time in seconds
 * @param bufferSeconds - Refresh buffer time in seconds (default: 300 = 5 minutes)
 * @returns true if token should be refreshed
 */
export function shouldRefreshToken(
  tokenUpdated: string,
  expiresIn: number,
  bufferSeconds = 300,
): boolean {
  const updatedTime = new Date(tokenUpdated).getTime();
  const expirationTime = updatedTime + expiresIn * 1000;
  const now = Date.now();

  // Refresh if token expires within buffer time
  return now >= expirationTime - bufferSeconds * 1000;
}