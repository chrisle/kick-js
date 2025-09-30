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
const getChannelDataImpl = async (
  channel: string,
  puppeteerOptions?: LaunchOptions,
): Promise<KickChannelInfo | null> => {
  let browser: Browser | undefined;
  try {
    console.log(`[Puppeteer] Starting browser for channel: ${channel}`);
    console.log(`[Puppeteer] Options:`, JSON.stringify(puppeteerOptions));

    const startTime = Date.now();
    const setup = await setupPuppeteer(puppeteerOptions);
    browser = setup.browser;
    const page = setup.page;
    console.log(`[Puppeteer] Browser launched in ${Date.now() - startTime}ms`);

    const url = `https://kick.com/api/v2/channels/${channel}`;
    console.log(`[Puppeteer] Navigating to: ${url}`);

    const navStartTime = Date.now();
    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log(`[Puppeteer] Navigation completed in ${Date.now() - navStartTime}ms`);
    console.log(`[Puppeteer] Response status: ${response?.status()}`);
    console.log(`[Puppeteer] Response headers:`, response?.headers());

    if (response && response.status() === 404) {
      throw new Error(`Channel '${channel}' does not exist on Kick.com`);
    }

    if (response && response.status() === 403) {
      console.log(`[Puppeteer] 403 Forbidden - Cloudflare may be blocking`);
      throw new Error("Request forbidden");
    }

    console.log(`[Puppeteer] Extracting page content...`);
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
          console.error(`[Puppeteer] Received HTML instead of JSON: ${bodyText.substring(0, 200)}`);
          throw new Error(
            "Channel not found - received error page instead of JSON",
          );
        }

        try {
          return JSON.parse(bodyText) as KickChannelInfo;
        } catch {
          console.error(`[Puppeteer] Failed to parse JSON: ${bodyText.substring(0, 100)}`);
          throw new Error(
            `Invalid JSON response: ${bodyText.substring(0, 100)}...`,
          );
        }
      },
    );

    console.log(`[Puppeteer] Successfully retrieved channel data for: ${channel}`);
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

/**
 * Mutable reference to the getChannelData function.
 * Can be replaced at runtime to override the default implementation.
 */
export let getChannelData = getChannelDataImpl;

/**
 * Replace the getChannelData function with a custom implementation
 * @param customImpl - Custom function to use instead of the default Puppeteer implementation
 */
export const setChannelDataProvider = (
  customImpl: (channel: string, puppeteerOptions?: LaunchOptions) => Promise<KickChannelInfo | null>
) => {
  getChannelData = customImpl;
};
