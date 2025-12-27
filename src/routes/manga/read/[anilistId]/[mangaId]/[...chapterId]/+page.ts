import type { PageLoad } from './$types.js';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch, url }) => {
  const anilistId = params.anilistId;
  const mangaId = params.mangaId;
  const chapterIdParam = params.chapterId;
  const chapterId = Array.isArray(chapterIdParam) ? chapterIdParam.join('/') : chapterIdParam;

  // Get provider from URL query parameter, or default to 'mangahere'
  const provider = url.searchParams.get('provider') || 'mangahere';

  if (!anilistId || !mangaId || !chapterId) {
    throw error(400, 'Missing required parameters');
  }

  try {
    // Info API now uses AniList ID for fetching chapters
    // Pass the provider to the info API call
    const infoUrl = `/api/manga?type=info&id=${encodeURIComponent(anilistId)}&provider=${encodeURIComponent(provider)}`;
    const infoRes = await fetch(infoUrl);
    const infoData = await infoRes.json();

    if (!infoRes.ok) {
      throw error(infoRes.status, `Failed to fetch manga info: ${infoRes.statusText}`);
    }
    if (!infoData.success) {
      throw error(500, `Manga info error: ${infoData.error || 'Unknown error'}`);
    }

    // --- FILTER CHAPTERS BY ANILIST ID OR MANGA ID ---
    let allChapters = infoData?.data?.chapters ?? [];
    if (!Array.isArray(allChapters)) allChapters = [];

    const chapterList = allChapters
      .map((ch: any) => ({
        ...ch,
        id: String(ch.id),
        shortId: String(ch.id).split('/').slice(1).join('/')
      }));

    // Find current chapter index by matching the full chapterId part after the slash(es)
    const currentIndex = chapterList.findIndex((c: any) => c.shortId === chapterId);
    const chapterMeta = chapterList[currentIndex] ?? {};

    // Read API uses the full chapter id
    const apiChapterId = chapterMeta.id || `${mangaId}/${chapterId}`;
    const readUrl = `/api/manga?type=read&chapterId=${encodeURIComponent(apiChapterId)}&provider=${encodeURIComponent(provider)}`;
    const readRes = await fetch(readUrl);
    const readData = await readRes.json();

    if (!readRes.ok) {
      throw error(readRes.status, `Failed to fetch chapter pages: ${readRes.statusText}`);
    }
    if (!readData.success) {
      throw error(500, `Chapter read error: ${readData.error || 'Unknown error'}`);
    }

    // Handle different possible response formats for pages
    let pages: { page: number, img: string, headerForImage?: Record<string, string> }[] = [];
    if (readData.data) {
      if (Array.isArray(readData.data)) {
        pages = readData.data.filter((page: any) => page && page.img);
      } else if (readData.data.img) {
        pages = [readData.data];
      } else if (readData.data.pages && Array.isArray(readData.data.pages)) {
        pages = readData.data.pages.filter((page: any) => page && page.img);
      }
    }

    pages = pages
      .map((page: any, index: number) => {
        const originalImgUrl = typeof page.img === 'string' ? page.img : '';
        return {
          page: page.page ?? index,
          img: originalImgUrl,
          headerForImage: page.headerForImage || undefined
        };
      })
      .sort((a, b) => a.page - b.page);

    const mangaTitle =
      infoData.data?.title?.english ||
      infoData.data?.title?.romaji ||
      infoData.data?.title?.native ||
      'Unknown Manga';

    const title =
      chapterMeta.title ||
      chapterMeta.name ||
      `Chapter ${chapterMeta.chapterNumber || chapterMeta.chapter || chapterMeta.number || extractChapterNumber(chapterId) || ''}` ||
      mangaTitle;

    const chapterNumber = chapterMeta.chapterNumber ||
      chapterMeta.chapter ||
      chapterMeta.number ||
      extractChapterNumber(chapterId) ||
      'Unknown';

    const prevChapter = currentIndex > 0 ? chapterList[currentIndex - 1] : null;
    const nextChapter = currentIndex >= 0 && currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null;

    return {
      pages,
      chapterList: chapterList.map((chapter: any) => ({
        id: chapter.id,
        shortId: String(chapter.id).split('/').slice(1).join('/'),
        title: chapter.title || chapter.name || '',
        chapterNumber: chapter.chapterNumber || chapter.chapter || chapter.number || '',
        releasedDate: chapter.releasedDate || chapter.date || null
      })),
      currentIndex,
      title,
      chapterNumber: String(chapterNumber),
      anilistId,
      mangaId,
      chapterId,
      mangaTitle,
      mangaImage: infoData.data?.image || '',
      totalPages: pages.length,
      prevChapter: prevChapter
        ? {
            id: prevChapter.id,
            shortId: String(prevChapter.id).split('/').slice(1).join('/'),
            title: prevChapter.title || prevChapter.name || '',
            chapterNumber: prevChapter.chapterNumber || prevChapter.chapter || prevChapter.number || ''
          }
        : null,
      nextChapter: nextChapter
        ? {
            id: nextChapter.id,
            shortId: String(nextChapter.id).split('/').slice(1).join('/'),
            title: nextChapter.title || nextChapter.name || '',
            chapterNumber: nextChapter.chapterNumber || nextChapter.chapter || nextChapter.number || ''
          }
        : null,
      provider,
      loadedAt: new Date().toISOString()
    };

  } catch (err) {
    console.error('Error loading manga chapter:', err);

    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    if (err instanceof Error) {
      throw error(500, `Failed to load chapter: ${err.message}`);
    }

    throw error(500, 'Failed to load chapter: Unknown error');
  }
};

function extractChapterNumber(chapterId: string): string | null {
  const patterns = [
    /c(\d+(?:\.\d+)?)/i,
    /chapter[_-]?(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)$/,
  ];

  for (const pattern of patterns) {
    const match = chapterId.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
