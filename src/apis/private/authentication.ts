/**
 * Unofficial Authentication API using Puppeteer
 * These methods handle login and token extraction via browser automation
 */

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { authenticator } from "otplib";
import type { LoginCredentials } from "../../types/client";
import type { LaunchOptions, Browser, Page } from "puppeteer";

/**
 * Authenticate with Kick.com using login credentials
 * @param credentials - Login credentials with username, password, and OTP secret
 * @param channelName - Optional channel name to navigate to after authentication
 * @param puppeteerOptions - Optional Puppeteer launch options
 * @returns Promise resolving to authentication tokens and browser instances
 */
export const authentication = async (
  { username, password, otp_secret }: LoginCredentials,
  channelName?: string,
  puppeteerOptions?: LaunchOptions,
): Promise<{
  bearerToken: string;
  xsrfToken: string;
  cookies: string;
  allHeaders: Record<string, string>;
  isAuthenticated: boolean;
}> => {
  let bearerToken = "";
  let xsrfToken = "";
  let cookieString = "";
  let allHeaders: Record<string, string> = {};
  let isAuthenticated = false;

  let browser: Browser | undefined;
  try {
    browser = await puppeteer.use(StealthPlugin()).launch({
      headless: false,
      ...puppeteerOptions,
    });
    const page = await browser.newPage();

    const requestData: unknown[] = [];

    await page.setRequestInterception(true);

    page.on("request", (request) => {
      const url = request.url();
      const headers = request.headers();

      if (
        url.includes("kick.com") &&
        headers["authorization"] &&
        headers["authorization"].includes("Bearer ")
      ) {
        if (!bearerToken) {
          const reqBearerToken = headers["authorization"];
          const splitToken = reqBearerToken.split("Bearer ")[1];
          if (splitToken) {
            bearerToken = splitToken;
            console.debug(
              `Bearer token captured from authenticated request: ${url}`,
            );
          }
        }

        allHeaders = { ...headers };
        console.debug(`Headers captured/updated from: ${url}`);
      }

      if (url.includes("kick.com") && headers["cookie"] && !cookieString) {
        cookieString = headers["cookie"];
        console.debug(`Cookies captured from ${url}`);
      }

      requestData.push({
        url,
        headers,
        method: request.method(),
        resourceType: request.resourceType(),
      });

      void request.continue();
    });

    const selectorTimeout = 6000;
    await page.goto("https://kick.com/");
    await page.waitForSelector("nav > div:nth-child(3) > button:first-child", {
      visible: true,
      timeout: selectorTimeout,
    });
    await page.click("nav > div:nth-child(3) > button:first-child");

    await page.waitForSelector('input[name="emailOrUsername"]', {
      visible: true,
      timeout: selectorTimeout,
    });

    await page.type('input[name="emailOrUsername"]', username);
    await page.type('input[name="password"]', password);
    await page.click('button[data-testid="login-submit"]');
    console.debug("Login form submitted, waiting for response...");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const loginError = await page.evaluate(() => {
      const errorSelectors = [
        '[role="alert"]',
        '[data-testid="error"]',
        ".alert-error",
      ];

      for (const selector of errorSelectors) {
        const errorElement = document.querySelector(selector);
        if (errorElement && errorElement.textContent?.trim()) {
          const errorText = errorElement.textContent.trim().toLowerCase();
          if (
            errorText.includes("invalid") ||
            errorText.includes("incorrect") ||
            errorText.includes("failed") ||
            errorText.includes("wrong")
          ) {
            return errorElement.textContent.trim();
          }
        }
      }

      return null;
    });

    if (loginError) {
      console.warn(`Detected login error: ${loginError}`);
    }

    try {
      await page.waitForFunction(
        () => {
          const element = document.querySelector(
            'input[data-input-otp="true"]',
          );
          const verifyText =
            document.body.textContent?.includes("Verify 2FA Code");
          return element || !verifyText;
        },
        { timeout: selectorTimeout },
      );

      const requires2FA = await page.evaluate(() => {
        return !!document.querySelector('input[data-input-otp="true"]');
      });

      if (requires2FA) {
        if (!otp_secret) {
          throw new Error("2FA authentication required");
        }

        const token = authenticator.generate(otp_secret);
        await page.waitForSelector('input[data-input-otp="true"]');
        await page.type('input[data-input-otp="true"]', token, { delay: 100 });
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: "networkidle0" });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("2FA authentication required")) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const isLoggedIn = await page.evaluate(() => {
      return !!(
        document.querySelector('[data-testid="user-menu"]') ||
        document.querySelector('[data-testid="profile-menu"]') ||
        document.querySelector('button[aria-label*="profile"]') ||
        document.querySelector('img[alt*="avatar"]')
      );
    });

    console.debug(
      "Login check:",
      isLoggedIn ? "User appears to be logged in" : "Login may have failed",
    );

    if (isLoggedIn) {
      console.debug(
        "Login detected, making authenticated requests to capture working headers...",
      );
      try {
        console.debug("Making authenticated API calls to capture headers...");

        await page.goto("https://kick.com/api/v2/user", {
          waitUntil: "networkidle0",
          timeout: 10000,
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        await page.goto("https://kick.com/api/v2/channels/followed", {
          waitUntil: "networkidle0",
          timeout: 10000,
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const targetChannel = channelName || "xqc";
        await page.goto(`https://kick.com/${targetChannel}`, {
          waitUntil: "networkidle0",
          timeout: 10000,
        });
        await new Promise((resolve) => setTimeout(resolve, 3000));
        console.debug(
          `Channel page loaded for ${targetChannel}, session established`,
        );

        await page.goto(
          `https://kick.com/api/v2/channels/${targetChannel}/chatroom`,
          {
            waitUntil: "networkidle0",
            timeout: 10000,
          },
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (e) {
        console.debug(
          "Some authenticated requests failed, but continuing...",
          e,
        );
      }
    }

    const cookies = await page.cookies();
    cookieString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const xsrfTokenCookie = cookies.find(
      (cookie) => cookie.name === "XSRF-TOKEN",
    )?.value;
    if (xsrfTokenCookie) {
      xsrfToken = decodeURIComponent(xsrfTokenCookie);
    }

    console.debug("Authentication debug:");
    console.debug("  Cookies captured:", cookieString ? "Yes" : "No");
    console.debug("  Bearer token captured:", bearerToken ? "Yes" : "No");
    console.debug("  XSRF token captured:", xsrfToken ? "Yes" : "No");
    if (xsrfToken) {
      console.debug("  XSRF token value:", xsrfToken.substring(0, 20) + "...");
    }

    console.debug("All cookies:");
    cookies.forEach((cookie) => {
      console.debug(`  ${cookie.name}: ${cookie.value.substring(0, 30)}...`);
    });

    if (!cookieString || cookieString === "") {
      throw new Error("Failed to capture cookies");
    }
    if (!bearerToken || bearerToken === "") {
      const storageToken = await page.evaluate(() => {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
      });
      if (storageToken) {
        bearerToken = storageToken;
        console.debug("  Bearer token found in storage");
      } else {
        console.debug(
          "  Warning: No bearer token captured, some features may not work",
        );
        bearerToken = "";
      }
    }
    if (!xsrfToken || xsrfToken === "") {
      throw new Error("Failed to capture xsrf token");
    }

    isAuthenticated = true;

    if (channelName) {
      try {
        console.debug(
          `Navigating to chat room for ${channelName} to capture additional headers...`,
        );

        await page.goto(`https://kick.com/popout/${channelName}/chat`, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.debug(
          `Chat room navigation completed - final headers should be captured`,
        );
      } catch (error) {
        console.debug(
          `Warning: Could not navigate to chat room (this may affect message sending):`,
          error,
        );
      }
    }

    return {
      bearerToken,
      xsrfToken,
      cookies: cookieString,
      allHeaders,
      isAuthenticated,
    };
  } catch (error: unknown) {
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
