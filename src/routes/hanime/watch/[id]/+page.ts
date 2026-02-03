import type { PageLoad } from './$types.js';

// Helper to clean id for search: replace - with %20, remove 'episode' and trailing number
function cleanSearchId(id: string): string {
  // Remove '-episode-N' or 'episode-N' at end, ignore case
  let cleaned = id.replace(/-?episode-\d+$/i, '');
  // Do NOT remove trailing -N or N, keep the main title number
  // Replace all remaining '-' with '%20'
  cleaned = cleaned.replace(/-/g, '%20');
  return cleaned;
}

export const load: PageLoad = async ({ params, fetch }) => {
  const id = params.id;
  if (!id) {
    return { info: null, videoSrc: null, relatedEpisodes: [], similarSeries: [], subtitles: [] };
  }

  // Fetch watch/episode data (contains all info, sources, related episodes, similar series)
  const watchRes = await fetch(`/api/hanime/watch?id=${encodeURIComponent(id)}`);
  const watchData = watchRes.ok ? await watchRes.json() : null;
  const episodeInfo = watchData?.data?.data ?? null;

  let videoSrc: string | null = null;

  // Extract video sources from the new API structure
  const videoSources = episodeInfo?.videoSources ?? [];
  
  // Prefer mp4 sources over iframe
  const mp4Source = videoSources.find((s: any) => s.type === 'mp4');
  const iframeSource = videoSources.find((s: any) => s.type === 'iframe');

  if (mp4Source?.url) {
    videoSrc = mp4Source.url;
  } else if (iframeSource?.url) {
    videoSrc = iframeSource.url;
  } else if (videoSources.length > 0) {
    videoSrc = videoSources[0].url;
  }



  return {
    info: episodeInfo,
    videoSrc,
    relatedEpisodes: episodeInfo?.relatedEpisodes ?? [],
    similarSeries: episodeInfo?.similarSeries ?? [],
    subtitles: [],
    error: null
  };
};