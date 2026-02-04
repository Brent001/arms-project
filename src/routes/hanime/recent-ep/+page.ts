import type { PageLoad } from './$types.js';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ url, fetch }) => {
  const pageParam = url.searchParams.get('page');
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  // Validate page number
  if (isNaN(page) || page < 1) {
    return {
      episodes: [],
      pagination: { currentPage: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
    };
  }

  try {
    const resp = await fetch(`/api/hanime/recent-ep?page=${page}`);

    if (!resp.ok) {
      throw error(resp.status, 'Failed to fetch recent episodes');
    }

    const data = await resp.json();

    if (!data?.results || data.results.length === 0) {
      // If page is not found, return empty
      if (page > 1) {
        throw error(404, 'Page not found');
      }
    }

    return {
      episodes: data?.results || [],
      pagination: data?.pagination || { currentPage: page, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
    };
  } catch (err: unknown) {
    // Check if it's a SvelteKit error
    if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, 'Failed to load recent episodes');
  }
};