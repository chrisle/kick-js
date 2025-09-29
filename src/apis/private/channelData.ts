/**
 * Private channel data scraping using Puppeteer
 */

import type { KickChannelInfo } from "../../types/channels";
import type { LaunchOptions, Browser } from "puppeteer";
import { setupPuppeteer } from "./utils";

/**
 * Fetch channel data from Kick.com API using Puppeteer
 * @param channel - Channel name to fetch data for
 * @param puppeteerOptions - Optional Puppeteer launch options
 * @returns Promise resolving to channel info or null if not found
 * @throws Error if channel doesn't exist or request is forbidden
 */
export const getChannelData = async (
  channel: string,
  puppeteerOptions?: LaunchOptions,
): Promise<KickChannelInfo | null> => {
  let browser: Browser | undefined;
  try {
    const setup = await setupPuppeteer(puppeteerOptions);
    browser = setup.browser;
    const page = setup.page;

    const response = await page.goto(
      `https://kick.com/api/v2/channels/${channel}`,
    );

    if (response && response.status() === 404) {
      throw new Error(`Channel '${channel}' does not exist on Kick.com`);
    }

    if (response && response.status() === 403) {
      throw new Error("Request forbidden");
    }

    const jsonContent: KickChannelInfo = await page.evaluate(
      (): KickChannelInfo => {
        const bodyText = document.querySelector("body")!.innerText.trim();

        // Check if response looks like HTML or error page rather than JSON
        if (
          bodyText.startsWith("<") ||
          bodyText.startsWith("<!DOCTYPE") ||
          bodyText.includes("<html") ||
          bodyText.includes("Oops") ||
          bodyText.includes("can't find the page") ||
          bodyText.includes("Something went wrong")
        ) {
          throw new Error(
            "Channel not found - received error page instead of JSON",
          );
        }

        try {
          return JSON.parse(bodyText) as KickChannelInfo;
        } catch {
          throw new Error(
            `Invalid JSON response: ${bodyText.substring(0, 100)}...`,
          );
        }
      },
    );

    return jsonContent;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("Channel not found") ||
      errorMessage.includes("does not exist") ||
      errorMessage.includes("Request forbidden")
    ) {
      throw error;
    }
    console.error("Error getting channel data:", error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
