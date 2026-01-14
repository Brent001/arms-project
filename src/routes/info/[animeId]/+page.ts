// +page.ts - UPDATED VERSION
import type { PageLoad } from './$types.js';
import { error } from '@sveltejs/kit';

const FETCH_TIMEOUT_MS = 10000; // 10 seconds timeout for fetches

// Helper function for fetches with a timeout
async function fetchWithTimeout(fetcher: typeof fetch, url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetcher(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Fetch timed out or was aborted');
    }
    throw err;
  }
}

export const load: PageLoad = async ({ params, fetch }) => {
  const animeId = params.animeId;

  if (!animeId) {
    throw error(400, 'Anime ID is required');
  }

  let animeData: any = null;
  let moreInfoData: any = null;
  let recommendedAnimes: any[] = [];
  let relatedAnimes: any[] = [];
  let seasons: any[] = [];
  let top10Animes: any = { today: [], week: [], month: [] };
  let genres: any[] = []; // Add genres array
  let pageLoadError: string | null = null; // To capture specific errors for the page component

  // Fetch main anime info
  try {
    const resp = await fetchWithTimeout(fetch, `/api/info?animeId=${animeId}`);

    if (!resp.ok) {
      if (resp.status === 404) {
        throw error(404, 'Anime not found'); // Still throw 404 for specific "not found"
      }
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }

    const json = await resp.json();

    // Check if we have the new API structure
    if (json?.data?.anime?.info) {
      // New API structure
      animeData = json.data.anime.info;
      moreInfoData = json.data.anime.moreInfo;
      recommendedAnimes = json.data.recommendedAnimes || [];
      relatedAnimes = json.data.relatedAnimes || [];
      seasons = json.data.seasons || [];
      // Also check for top10Animes from this response
      if (json.data.top10Animes) {
        top10Animes = {
          today: json.data.top10Animes.today ?? [],
          week: json.data.top10Animes.week ?? [],
          month: json.data.top10Animes.month ?? []
        };
      }
    } else if (json?.data?.anime) {
      // Legacy API structure (fallback)
      animeData = json.data.anime;
      moreInfoData = json.data.moreInfo; // assuming moreInfo is directly under data for legacy
      recommendedAnimes = json.data.recommendedAnimes || [];
      relatedAnimes = json.data.relatedAnimes || [];
      seasons = json.data.seasons || [];
      // Also check for top10Animes from this response
      if (json.data.top10Animes) {
        top10Animes = {
          today: json.data.top10Animes.today ?? [],
          week: json.data.top10Animes.week ?? [],
          month: json.data.top10Animes.month ?? []
        };
      }
    } else {
      pageLoadError = 'Invalid or incomplete API response for anime info.';
      console.warn('Invalid or incomplete API response for anime info:', json);
    }

    // Transform charactersVoiceActors to have singular voiceActor
    if (animeData?.charactersVoiceActors) {
      animeData.charactersVoiceActors = animeData.charactersVoiceActors.flatMap((cva: any) =>
        cva.voiceActors.map((va: any) => ({
          character: cva.character,
          voiceActor: va
        }))
      );
    }

    // Defensive: ensure rating is always present if animeData exists
    if (animeData?.stats) {
      if (!animeData.stats.rating || typeof animeData.stats.rating !== 'string') {
        animeData.stats.rating = 'N/A';
      }
    }

  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
      // This is a SvelteKit 'error' object (e.g., 404 from above), re-throw it immediately
      throw err;
    }
    console.error('Error fetching main anime info:', err);
    pageLoadError = `Failed to load anime details: ${err instanceof Error ? err.message : String(err)}`;
    // Keep animeData/moreInfoData null so the Svelte component can show the error state
  }

  // Fetch home data (for sidebar and genres) if not already populated or if it failed
  if (!top10Animes?.month?.length || !top10Animes?.week?.length || !top10Animes?.today?.length || genres.length === 0) {
    try {
      const homeResp = await fetchWithTimeout(fetch, '/api/home');
      if (homeResp.ok) {
        const homeJson = await homeResp.json();
        top10Animes = {
          today: homeJson?.data?.top10Animes?.today ?? [],
          week: homeJson?.data?.top10Animes?.week ?? [],
          month: homeJson?.data?.top10Animes?.month ?? []
        };
        genres = homeJson?.data?.genres ?? []; // Add genres from home API
      } else {
        console.warn('Failed to fetch home data for sidebar and genres:', homeResp.statusText);
      }
    } catch (err) {
      console.warn('Error fetching home data for sidebar and genres:', err);
      // top10Animes already defaults to empty arrays, genres defaults to empty array, so no further action needed here.
    }
  }

  return {
    anime: animeData,
    moreInfo: moreInfoData,
    recommendedAnimes: recommendedAnimes,
    relatedAnimes: relatedAnimes,
    seasons: seasons,
    top10Animes: top10Animes,
    genres: genres, // Add genres to return
    pageLoadError: pageLoadError // Pass the error message to the Svelte component
  };
};

export const ssr = true;
export const csr = true;