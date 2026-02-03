import type { PageLoad } from './$types.js';
import { error, redirect } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, url, fetch }) => {
  const brand = params.id;
  const pageParam = url.searchParams.get('page');
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  if (!brand) {
    throw error(400, 'Brand name is required');
  }

  // Validate page number and redirect if invalid
  if (isNaN(page) || page < 1) {
    const correctedUrl = new URL(url);
    correctedUrl.searchParams.set('page', '1');
    throw redirect(302, correctedUrl.toString());
  }

  try {
    const apiUrl = `/api/hanime/brand/${encodeURIComponent(brand)}?page=${page}`;
    const resp = await fetch(apiUrl);

    if (!resp.ok) {
      const errJson = await resp.json();
      throw error(resp.status, errJson?.error || 'Failed to fetch brand data');
    }

    const json = await resp.json();

    if (json.status === 'error') {
      throw error(404, json.error || 'Brand not found');
    }

    // Handle transformed API response: { status, data: { results, currentPage, totalPages } }
    const results = json?.data?.results || [];
    const currentPage = json?.data?.currentPage || page;
    const totalPages = json?.data?.totalPages || 1;

    if (!results || results.length === 0) {
      throw error(404, 'No hanime found for this brand');
    }

    return {
      brand,
      animes: results,
      currentPage,
      totalPages
    };
  } catch (err: unknown) {
    // Check if it's a SvelteKit error
    if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, 'Failed to load brand data');
  }
};