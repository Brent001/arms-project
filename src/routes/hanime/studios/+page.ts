import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ fetch }) => {
  try {
    const response = await fetch('/api/hanime/brand');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch studios');
    }
    const result = await response.json();
    
    if (result.status === 'success' && result.data && Array.isArray(result.data.results)) {
      return {
        brands: result.data.results,
        error: null,
      };
    } else {
      throw new Error('Invalid data format received from API');
    }
  } catch (e: any) {
    return {
      brands: [],
      error: e.message || 'Failed to load studios. Please try again later.',
    };
  }
};