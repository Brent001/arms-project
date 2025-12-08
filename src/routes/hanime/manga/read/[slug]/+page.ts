import type { PageLoad } from './$types.js';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
  const { slug } = params;

  if (!slug || slug.trim() === '') {
    throw error(400, 'Missing manga slug parameter');
  }

  try {
    // Extract manga slug from chapter slug (e.g., "taming-a-maid-chapter-1" -> "taming-a-maid")
    const mangaSlug = slug.replace(/-chapter-\d+(?:\.\d+)?$/i, '');

    // Fetch chapter pages from the read API
    const readRes = await fetch(`/api/hanime/manga/read/${encodeURIComponent(slug)}`);
    
    if (!readRes.ok) {
      throw error(readRes.status, `Failed to fetch chapter pages: ${readRes.statusText}`);
    }

    const readData = await readRes.json();

    if (readData.status !== 'success' || !Array.isArray(readData.data)) {
      throw error(500, 'Invalid response structure from read API');
    }

    // Fetch manga info to get chapters list
    let chapterList = [];
    let mangaTitle = slug.replace(/-/g, ' ');
    
    try {
      const infoRes = await fetch(`/api/hanime/manga/info/${encodeURIComponent(mangaSlug)}`);
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        if (infoData.status === 'success' && infoData.data) {
          chapterList = infoData.data.chapters || [];
          mangaTitle = infoData.data.title || mangaTitle;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch manga info for sidebar:', err);
    }

    // Transform the page data
    const pages = readData.data.map((imgUrl: string, index: number) => ({
      page: index + 1,
      img: imgUrl,
      headerForImage: { 'Referer': 'https://hentai1.io' }
    }));

    // Find current chapter index
    const currentIndex = chapterList.findIndex((ch: any) => ch.slug === slug);

    // Extract chapter info from slug
    const chapterNumber = extractChapterNumber(slug);

    return {
      pages,
      chapterList,
      currentIndex: currentIndex >= 0 ? currentIndex : 0,
      title: mangaTitle,
      chapterNumber: chapterNumber || '1',
      mangaId: mangaSlug,
      chapterId: slug,
      anilistId: slug,
      provider: 'hanime',
      totalPages: pages.length
    };
  } catch (err) {
    console.error('Error loading hanime manga chapter:', err);

    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    if (err instanceof Error) {
      throw error(500, `Failed to load chapter: ${err.message}`);
    }

    throw error(500, 'Failed to load chapter: Unknown error');
  }
};

function extractChapterNumber(slug: string): string {
  const match = slug.match(/chapter-(\d+(?:\.\d+)?)/i);
  return match ? match[1] : '1';
}