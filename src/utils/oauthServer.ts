import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { parse } from "url";
import crypto from "crypto";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface PKCECodePair {
  codeVerifier: string;
  codeChallenge: string;
}

interface OAuthQuery {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

export class KickOAuthServer {
  private server: ReturnType<typeof createServer> | null = null;
  private config: OAuthConfig;
  private port: number;
  private authState: string | null = null;
  private pkceCodePair: PKCECodePair | null = null;
  private authorizationCode: string | null = null;

  /**
   * Creates a new KickOAuthServer instance
   * @param config - OAuth configuration with client ID, secret, redirect URI, and scopes
   * @param port - Port number for the callback server (default: 3000)
   */
  constructor(config: OAuthConfig, port = 3000) {
    this.config = config;
    this.port = port;
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  /**
   * Generate PKCE code verifier and challenge for OAuth 2.1 security
   * @returns Object containing code verifier and challenge
   */
  private generatePKCE(): PKCECodePair {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate a secure random state parameter
   */
  /**
   * Generate a secure random state parameter for CSRF protection
   * @returns Random hex string
   */
  private generateState(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * Start the OAuth callback server
   */
  /**
   * Start the OAuth callback server
   * @returns Promise that resolves when server is started
   */
  async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer(
        (req: IncomingMessage, res: ServerResponse) => {
          this.handleRequest(req, res);
        },
      );

      this.server.listen(this.port, () => {
        console.log(
          `OAuth callback server started on http://localhost:${this.port}`,
        );
        resolve();
      });

      this.server.on("error", reject);
    });
  }

  /**
   * Stop the OAuth callback server
   */
  /**
   * Stop the OAuth callback server
   * @returns Promise that resolves when server is stopped
   */
  async stopServer(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.server = null;
          resolve();
        });
      });
    }
  }

  /**
   * Handle incoming HTTP requests
   */
  /**
   * Handle incoming HTTP requests
   * @param req - HTTP request object
   * @param res - HTTP response object
   */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const parsedUrl = parse(req.url || "", true);

    if (parsedUrl.pathname === "/callback") {
      this.handleOAuthCallback(parsedUrl.query, res);
    } else if (parsedUrl.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  }

  /**
   * Handle OAuth callback
   * @param query - OAuth callback query parameters
   * @param res - HTTP response object
   */
  /**
   * Handle OAuth callback from authorization server
   * @param query - OAuth callback query parameters
   * @param res - HTTP response object
   */
  private handleOAuthCallback(query: OAuthQuery, res: ServerResponse): void {
    const { code, state, error, error_description } = query;

    if (error) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <body>
            <h1>OAuth Error</h1>
            <p>Error: ${error}</p>
            <p>Description: ${error_description || "Unknown error"}</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `);
      return;
    }

    if (!code || !state) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <body>
            <h1>OAuth Error</h1>
            <p>Missing required parameters (code or state)</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `);
      return;
    }

    if (state !== this.authState) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <body>
            <h1>OAuth Error</h1>
            <p>Invalid state parameter</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `);
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html>
        <body>
          <h1>Authorization Successful!</h1>
          <p>You can close this window and return to your application.</p>
          <script>
            window.postMessage({ type: 'oauth_success', code: '${code}' }, '*');
          </script>
        </body>
      </html>
    `);

    // Store the authorization code for retrieval
    this.authorizationCode = code;
  }

  /**
   * Get authorization URL for user token flow
   */
  /**
   * Get authorization URL for user token flow
   * @returns Authorization URL to redirect user to
   */
  getAuthorizationUrl(): string {
    this.authState = this.generateState();
    this.pkceCodePair = this.generatePKCE();

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: "code",
      redirect_uri: this.config.redirectUri,
      state: this.authState,
      scope: this.config.scopes.join(" "),
      code_challenge: this.pkceCodePair.codeChallenge,
      code_challenge_method: "S256",
    });

    return `https://id.kick.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token (user token flow)
   */
  /**
   * Exchange authorization code for access token (user token flow)
   * @param code - Authorization code received from callback
   * @returns Promise resolving to OAuth token response
   * @throws Error if PKCE code pair not generated or token exchange fails
   */
  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    if (!this.pkceCodePair) {
      throw new Error("PKCE code pair not generated");
    }

    const tokenData = {
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code: code,
      redirect_uri: this.config.redirectUri,
      code_verifier: this.pkceCodePair.codeVerifier,
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
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    return (await response.json()) as OAuthTokenResponse;
  }

  /**
   * Get app access token (client credentials flow)
   */
  /**
   * Get app access token (client credentials flow)
   * @returns Promise resolving to OAuth token response
   * @throws Error if app token request fails
   */
  async getAppAccessToken(): Promise<OAuthTokenResponse> {
    const tokenData = {
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: this.config.scopes.join(" "),
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
      throw new Error(
        `App token request failed: ${response.status} ${errorText}`,
      );
    }

    return (await response.json()) as OAuthTokenResponse;
  }

  /**
   * Refresh an access token
   */
  /**
   * Refresh an access token using a refresh token
   * @param refreshToken - Refresh token to use for getting new access token
   * @returns Promise resolving to new OAuth token response
   * @throws Error if token refresh fails
   */
  async refreshToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const tokenData = {
      grant_type: "refresh_token",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
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

    return (await response.json()) as OAuthTokenResponse;
  }

  /**
   * Revoke a token
   */
  /**
   * Revoke an access or refresh token
   * @param token - Token to revoke (access or refresh token)
   * @throws Error if token revocation fails
   */
  async revokeToken(token: string): Promise<void> {
    const revokeData = {
      token: token,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    };

    const response = await fetch("https://id.kick.com/oauth/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(revokeData).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Token revocation failed: ${response.status} ${errorText}`,
      );
    }
  }

  /**
   * Wait for authorization code from callback
   */
  /**
   * Wait for authorization code from callback
   * @param timeout - Timeout in milliseconds (default: 300000 = 5 minutes)
   * @returns Promise resolving to authorization code
   * @throws Error if authorization times out
   */
  async waitForAuthorizationCode(timeout = 300000): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkCode = () => {
        if (this.authorizationCode) {
          const code = this.authorizationCode;
          this.authorizationCode = null;
          resolve(code);
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error("Authorization timeout"));
          return;
        }

        setTimeout(checkCode, 1000);
      };

      checkCode();
    });
  }
}

/**
 * Setup cloudflared tunnel helper to expose local server publicly
 * @param localPort - Local port number to tunnel
 * @param subdomain - Subdomain to use for tunnel (default: 'test.chrisle.me')
 * @returns Promise that resolves when tunnel is established
 * @throws Error if tunnel setup fails or times out
 */
export async function setupCloudflaredTunnel(
  localPort: number,
  subdomain = "test.chrisle.me",
): Promise<void> {
  const { spawn } = await import("child_process");

  return new Promise((resolve, reject) => {
    console.log(
      `Setting up cloudflared tunnel: ${subdomain} -> localhost:${localPort}`,
    );

    const tunnel = spawn(
      "cloudflared",
      [
        "tunnel",
        "--hostname",
        subdomain,
        "--url",
        `http://localhost:${localPort}`,
      ],
      {
        stdio: "pipe",
      },
    );

    tunnel.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      console.log("[cloudflared]", output.trim());

      if (output.includes("Connection established")) {
        resolve();
      }
    });

    tunnel.stderr?.on("data", (data: Buffer) => {
      const output = data.toString();
      console.error("[cloudflared error]", output.trim());
    });

    tunnel.on("error", (error) => {
      reject(new Error(`Failed to start cloudflared: ${error.message}`));
    });

    tunnel.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`cloudflared exited with code ${code}`));
      }
    });

    // Timeout if tunnel doesn't establish within 30 seconds
    setTimeout(() => {
      tunnel.kill();
      reject(new Error("Cloudflared tunnel timeout"));
    }, 30000);
  });
}
