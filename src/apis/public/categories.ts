/**
 * Kick.com Public Categories API
 * https://docs.kick.com/apis/categories
 */

export interface CategoryData {
  id: number;
  name: string;
  thumbnail?: string;
}

export interface CategoriesResponse {
  data: CategoryData[];
  message: string;
}

export interface CategoryResponse {
  data: CategoryData;
  message: string;
}

/**
 * Search for categories using the official Kick.com API
 * @param bearerToken - Bearer token for authentication
 * @param query - Search query string
 * @param page - Optional page number (defaults to 1)
 * @returns Promise resolving to categories data
 */
export const searchCategories = async (
  bearerToken: string,
  query: string,
  page: number = 1
): Promise<CategoriesResponse> => {
  if (!query.trim()) {
    throw new Error('Search query is required');
  }

  const params = new URLSearchParams({
    q: query,
    page: page.toString()
  });

  const response = await fetch(`https://api.kick.com/public/v1/categories?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Search categories failed: ${response.status}`);
  }

  return await response.json() as CategoriesResponse;
};

/**
 * Get a specific category by ID using the official Kick.com API
 * @param bearerToken - Bearer token for authentication
 * @param categoryId - Category ID to fetch
 * @returns Promise resolving to category data
 */
export const getCategory = async (
  bearerToken: string,
  categoryId: number
): Promise<CategoryResponse> => {
  if (!categoryId || categoryId <= 0) {
    throw new Error('Valid category ID is required');
  }

  const response = await fetch(`https://api.kick.com/public/v1/categories/${categoryId}`, {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Get category failed: ${response.status}`);
  }

  return await response.json() as CategoryResponse;
};