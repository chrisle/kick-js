/**
 * Shared utilities for private/unofficial API methods
 */

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { PuppeteerLaunchOptions } from "puppeteer";

/**
 * Set up Puppeteer browser with stealth plugin
 * @param puppeteerOptions - Optional Puppeteer launch options
 * @returns Browser and page instances
 */
export const setupPuppeteer = async (
  puppeteerOptions?: PuppeteerLaunchOptions,
) => {
  // Default to headless mode unless explicitly set to false
  // This can be overridden by HEADLESS=false environment variable or puppeteerOptions
  const defaultHeadless = process.env.HEADLESS !== "false";

  const browser = await puppeteer.use(StealthPlugin()).launch({
    headless: defaultHeadless,
    ...puppeteerOptions,
  });
  const page = await browser.newPage();
  return { browser, page };
};
