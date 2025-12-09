import type { PageLoad } from './$types.js';
import { error, redirect } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, url, fetch }) => {
  const slug = params.slug;
  const pageParam = url.searchParams.get('page');
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  if (!slug) {
    throw error(400, 'Manga genre slug is required');
  }

  // Validate page number and redirect if invalid
  if (isNaN(page) || page < 1) {
    const correctedUrl = new URL(url);
    correctedUrl.searchParams.set('page', '1');
    throw redirect(302, correctedUrl.toString());
  }

  try {
    const apiUrl = `/api/hanime/manga/genre/${encodeURIComponent(slug)}?page=${page}`;
    const resp = await fetch(apiUrl);

    if (!resp.ok) {
      const errJson = await resp.json();
      throw error(resp.status, errJson?.error || 'Failed to fetch manga genre data');
    }

    const json = await resp.json();

    if (json.status === 'error') {
      throw error(404, json.error || 'Manga genre not found');
    }

    // Adapt to your API response structure: { status, data: { items, currentPage, totalPages, ... } }
    const results = json.data?.items || [];
    const currentPage = json.data?.currentPage || page;
    const totalPages = json.data?.totalPages || 1;

    return {
      genreSlug: slug,
      genreTitle: slug.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), // Capitalize words
      mangas: results,
      currentPage,
      totalPages
    };
  } catch (err) {
    console.error('Error loading hanime manga genre data:', err);
    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit error
    }
    throw error(500, 'Failed to load manga genre data');
  }
};