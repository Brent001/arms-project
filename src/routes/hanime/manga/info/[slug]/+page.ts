import type { PageLoad } from './$types.js';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
  const { slug } = params;

  if (!slug) {
    throw error(400, 'Missing manga slug');
  }

  try {
    const res = await fetch(`/api/hanime/manga/info/${encodeURIComponent(slug)}`);
    
    if (!res.ok) {
      throw error(res.status, `Failed to load manga info: ${res.statusText}`);
    }

    const data = await res.json();
    
    if (data.status !== 'success' || !data.data) {
      throw error(500, data.error || 'Failed to load manga info');
    }

    return {
      manga: data.data,
      chapters: data.data.chapters || [],
      totalChapters: data.data.totalChapters || 0,
      relatedSeries: data.data.relatedSeries || [] // Add relatedSeries here
    };
  } catch (err) {
    console.error('Error loading manga info:', err);
    if (err instanceof Error) {
      throw error(500, `Failed to load manga info: ${err.message}`);
    }
    throw error(500, 'Failed to load manga info');
  }
};