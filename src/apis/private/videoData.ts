/**
 * Private video data scraping using Puppeteer
 */

import type { VideoInfo } from "../../types/video";
import type { LaunchOptions, Browser } from "puppeteer";
import { setupPuppeteer } from "./utils";

/**
 * Fetch video data from Kick.com API using Puppeteer
 * @param video_id - UUID of the video to fetch
 * @param puppeteerOptions - Optional Puppeteer launch options
 * @returns Promise resolving to video info or null if not found
 * @throws Error if video doesn't exist
 */
export const getVideoData = async (
  video_id: string,
  puppeteerOptions?: LaunchOptions,
): Promise<VideoInfo | null> => {
  let browser: Browser | undefined;
  try {
    const setup = await setupPuppeteer(puppeteerOptions);
    browser = setup.browser;
    const page = setup.page;

    const response = await page.goto(
      `https://kick.com/api/v1/video/${video_id}`,
    );

    if (response && response.status() === 404) {
      throw new Error(`Video '${video_id}' does not exist or has been removed`);
    }

    if (response && response.status() === 403) {
      throw new Error("Request forbidden");
    }

    const jsonContent: VideoInfo = await page.evaluate((): VideoInfo => {
      const bodyText = document.querySelector("body")!.innerText.trim();

      // Check if response looks like HTML or error page rather than JSON
      if (
        bodyText.startsWith("<") ||
        bodyText.startsWith("<!DOCTYPE") ||
        bodyText.includes("<html") ||
        bodyText.includes("Oops") ||
        bodyText.includes("Error Occurred") ||
        bodyText.includes("Something is broken")
      ) {
        throw new Error(
          "Video not found - received error page instead of JSON",
        );
      }

      try {
        return JSON.parse(bodyText) as VideoInfo;
      } catch {
        throw new Error(
          `Invalid JSON response: ${bodyText.substring(0, 100)}...`,
        );
      }
    });

    return jsonContent;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("Video not found") ||
      errorMessage.includes("does not exist") ||
      errorMessage.includes("Request forbidden")
    ) {
      throw error;
    }
    console.error("Error getting video data:", error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
