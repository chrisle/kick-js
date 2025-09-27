/**
 * Private featured livestreams scraping using Puppeteer
 */

import type { KickFeaturedLivestreams } from "../../types/livestreams";
import type { PuppeteerLaunchOptions, Browser } from "puppeteer";
import { setupPuppeteer } from "./utils";

export type FeaturedLivestreamsSort =
  | "viewers_high_to_low"
  | "viewers_low_to_high"
  | "recommended";

export interface GetFeaturedLivestreamsOptions {
  language?: string;
  sort?: FeaturedLivestreamsSort;
  puppeteerOptions?: PuppeteerLaunchOptions;
}

/**
 * Fetch featured livestreams from Kick.com API using Puppeteer
 * @param options - Configuration options
 * @param options.language - Language code or comma-separated codes (e.g., 'en' or 'sq,ar'). Default: 'en'
 * @param options.sort - Sort order: 'viewers_high_to_low', 'viewers_low_to_high', or 'recommended'
 * @param options.puppeteerOptions - Optional Puppeteer launch options
 * @returns Promise resolving to featured livestreams data or null on error
 * @throws Error if request is forbidden
 */
export const getFeaturedLivestreams = async (
  options: GetFeaturedLivestreamsOptions = {},
): Promise<KickFeaturedLivestreams | null> => {
  const { language = "en", sort, puppeteerOptions } = options;

  let browser: Browser | undefined;
  try {
    const setup = await setupPuppeteer(puppeteerOptions);
    browser = setup.browser;
    const page = setup.page;

    // Encode language parameter (e.g., "sq,ar" becomes "sq%2Car")
    const encodedLanguage = encodeURIComponent(language);

    // Build URL with query parameters
    const params = new URLSearchParams({ language: encodedLanguage });
    if (sort) {
      params.set("sort", sort);
    }

    const response = await page.goto(
      `https://web.kick.com/api/v1/livestreams/featured?${params.toString()}`,
    );

    if (response && response.status() === 403) {
      throw new Error("Request forbidden");
    }

    const jsonContent: KickFeaturedLivestreams = await page.evaluate(
      (): KickFeaturedLivestreams => {
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
            "Featured livestreams not found - received error page instead of JSON",
          );
        }

        try {
          return JSON.parse(bodyText) as KickFeaturedLivestreams;
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
      errorMessage.includes("not found") ||
      errorMessage.includes("Request forbidden")
    ) {
      throw error;
    }
    console.error("Error getting featured livestreams:", error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};