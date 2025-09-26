import axios, { type AxiosResponse } from "axios";

import { AxiosHeaders } from "axios";

export interface ApiHeaders extends AxiosHeaders {
  accept: string;
  authorization: string;
  "content-type": string;
  "x-xsrf-token": string;
  cookie: string;
  Referer: string;
}

export interface RequestConfig {
  bearerToken: string;
  xsrfToken: string;
  cookies: string;
  channelSlug: string;
}

/**
 * Create HTTP headers for Kick.com API requests
 * @param config - Request configuration with bearer token, cookies, and channel slug
 * @returns AxiosHeaders object with all required headers
 */
export const createHeaders = ({
  bearerToken,
  cookies,
  channelSlug,
}: RequestConfig): AxiosHeaders => {
  const headers = new AxiosHeaders();

  headers.set("accept", "application/json");
  headers.set("accept-language", "en-US,en;q=0.9");
  headers.set("authorization", `Bearer ${bearerToken}`);
  headers.set("cache-control", "max-age=0");
  headers.set("cluster", "v2");
  headers.set("content-type", "application/json");
  headers.set("priority", "u=1, i");
  headers.set("cookie", cookies);
  headers.set("Referer", `https://kick.com/${channelSlug}`);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return headers;
};

/**
 * Make HTTP request to Kick.com API with proper error handling
 * @param method - HTTP method (get, post, put, delete)
 * @param url - Request URL
 * @param headers - Request headers
 * @param data - Optional request body data
 * @returns Promise resolving to response data or null if failed
 */
export const makeRequest = async <T>(
  method: "get" | "post" | "put" | "delete",
  url: string,
  headers: AxiosHeaders,
  data?: unknown,
): Promise<T | null> => {
  try {
    const response: AxiosResponse<T> = await axios({
      method,
      url,
      headers,
      data,
    });

    if (response.status === 200) {
      return response.data;
    }
    console.error(`Request failed with status: ${response.status}`);
    return null;
  } catch (error) {
    console.error(`Request error for ${url}:`, error);
    return null;
  }
};
