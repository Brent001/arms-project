import type { PageLoad } from './$types.js';
import { error, redirect } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, url, fetch }) => {
  const pageParam = url.searchParams.get('page');
  const page = pageParam ? parseInt(pageParam, 10) : 1;


  // Validate page number and redirect if invalid
  if (isNaN(page) || page < 1) {
    const correctedUrl = new URL(url);
    correctedUrl.searchParams.set('page', '1');
    throw redirect(302, correctedUrl.toString());
  }

  try {
    // fetch tv shows archive from new API
    const apiUrl = `/api/hanime/tvshow?page=${page}`;
    const resp = await fetch(apiUrl);

    if (!resp.ok) {
      const errJson = await resp.json();
      throw error(resp.status, errJson?.error || 'Failed to fetch tv shows data');
    }

    const json = await resp.json();

    if (json.status === 'error') {
      throw error(404, json.error || 'TV shows not found');
    }

    // Expected API shape: { status, data: { provider, type, data: { results, pagination } } }
    const results = json?.data?.data?.results || [];
    const pagination = json?.data?.data?.pagination || {};
    const currentPage = pagination?.currentPage || page;
    const totalPages = pagination?.totalPages || 1;

    if (!results || results.length === 0) {
      throw error(404, 'No tv shows found');
    }

    // Map to page's expected anime shape
    const animes = results.map((item: any) => ({
      duration: item.duration || '--:--',
      id: item.slug || item.id || '',
      title: item.title || '',
      image: item.posterUrl || item.image || '',
      views: item.views || 0,
      slug: item.slug || item.id || '',
      year: item.year || null,
      rating: item.rating || null
    }));

    return {
      // Force a neutral page brand for this listing
      brand: 'TV Shows',
      animes,
      currentPage,
      totalPages
    };
  } catch (err: unknown) {
    // Check if it's a SvelteKit error
    if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, 'Failed to load tv shows');
  }
};