import type { PageLoad } from './$types.js';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch, url }) => {
  const id = params.id;
  if (!id) {
    throw error(400, 'Missing manga ID');
  }

  // Get provider from URL search params, or default to 'mangahere'
  const provider = url.searchParams.get('provider') || 'mangahere';

  try {
    const res = await fetch(`/api/manga?type=info&id=${encodeURIComponent(id)}&provider=${encodeURIComponent(provider)}`);
    if (!res.ok) {
      throw error(res.status, `Failed to load manga info: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw error(500, `Manga info error: ${data.error || 'Unknown error'}`);
    }

    const manga = data.data;

    return {
      manga,
      recommendations: manga.recommendations ?? [],
      relations: manga.relations ?? [],
      characters: manga.characters ?? [],
      chapters: manga.chapters ?? [],
      selectedProvider: provider
    };
  } catch (err) {
    console.error('Error loading manga info:', err);
    if (err instanceof Error) {
      throw error(500, `Failed to load manga info: ${err.message}`);
    }
    throw error(500, 'Failed to load manga info: Unknown error');
  }
};