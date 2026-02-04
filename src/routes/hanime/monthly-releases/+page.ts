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
    const apiUrl = `/api/hanime/monthly-release?page=${page}`;
    const resp = await fetch(apiUrl);

    if (!resp.ok) {
      const errJson = await resp.json();
      throw error(resp.status, errJson?.error || 'Failed to fetch monthly releases');
    }

    const json = await resp.json();

    if (json.status === 'error') {
      throw error(404, json.error || 'Monthly releases not found');
    }

    // Handle transformed API response: { status, data: { results, currentPage, totalPages } }
    const results = json?.data?.results || [];
    const currentPage = json?.data?.currentPage || page;
    const totalPages = json?.data?.totalPages || 1;

    if (!results || results.length === 0) {
      throw error(404, 'No monthly releases found');
    }

    // Transform results: use data from API
    const animes = results.map((item: any) => ({
      id: item.id || '',
      slug: item.id || '',
      image: item.image || '',
      title: item.title || '',
      episodeTitle: item.episodeTitle || '',
      releaseDate: item.releaseDate || '',
      duration: item.duration || '--:--',
      views: item.views || 0,
      rating: item.rating || null,
      year: item.year || null,
      genres: item.genres || []
    }));

    return {
      title: 'Monthly Releases',
      animes,
      currentPage,
      totalPages
    };
  } catch (err: unknown) {
    // Check if it's a SvelteKit error
    if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, 'Failed to load monthly releases');
  }
};

