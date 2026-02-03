import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ fetch }) => {
  try {
    const response = await fetch('/api/hanime/brand/');
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      return {
        results: [],
        brands: [],
        error: `Failed to load studios (${response.status})`,
      };
    }
    
    const result = await response.json();
    
    // Handle nested response structure: { status: 'success', data: { data: { results: [...] } } }
    let results: any[] = [];
    
    if (result?.status === 'success' && result?.data?.data?.results && Array.isArray(result.data.data.results)) {
      results = result.data.data.results;
    } else if (result?.data?.results && Array.isArray(result.data.results)) {
      results = result.data.results;
    } else if (result?.results && Array.isArray(result.results)) {
      results = result.results;
    } else if (Array.isArray(result)) {
      results = result;
    } else {
      console.warn('Unexpected API response format:', result);
      return {
        results: [],
        brands: [],
        error: 'Invalid data format received from API',
      };
    }
    
    if (!results || results.length === 0) {
      return {
        results: [],
        brands: [],
        error: 'No studios found',
      };
    }
    
    return {
      results,
      brands: results, // Support both names for backwards compatibility
      error: null,
    };
  } catch (e: any) {
    console.error('Error loading studios:', e);
    return {
      results: [],
      brands: [],
      error: e?.message || 'Failed to load studios. Please try again later.',
    };
  }
};