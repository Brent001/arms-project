import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ params, fetch }) => {
  const episodeId = params.episodeId;
  const animeId = episodeId.split('?')[0];

  if (!animeId) {
    console.error('Invalid animeId:', animeId);
    return {
      error: 'Invalid animeId',
      videoSources: [],
      subtitles: [],
      episodes: [],
      episodeId,
      anime: null,
      relatedAnimes: [],
      recommendedAnimes: []
    };
  }

  let sourcesJson: any = null;
  let subtitles: any[] = [];
  let intro: { start: number; end: number } | null = null;
  let outro: { start: number; end: number } | null = null;

  async function fetchSources(episodeId: string, server: string, category: string) {
    const resp = await fetch(`/api/anime?action=sources&animeEpisodeId=${episodeId}&server=${server}&category=${category}`);
    sourcesJson = await resp.json();
    if (sourcesJson.success) {
      // Format subtitles properly for the video component
      interface SubtitleTrack {
        url: string;
        lang: string;
      }

      interface Subtitle {
        src: string;
        label: string;
        srclang: string;
        default: boolean;
      }

      subtitles = (sourcesJson.data.tracks ?? [])
        .filter((track: SubtitleTrack) => track.lang !== 'thumbnails')
        .map((track: SubtitleTrack) => ({
          src: track.url, // Use 'src' instead of 'url'
          label: track.lang,
          srclang:
            track.lang.toLowerCase().startsWith('english')
              ? 'en'
              : track.lang.toLowerCase().startsWith('portuguese')
              ? 'pt'
              : track.lang.toLowerCase().startsWith('spanish')
              ? 'es'
              : track.lang.toLowerCase().startsWith('french')
              ? 'fr'
              : track.lang.toLowerCase().startsWith('german')
              ? 'de'
              : track.lang.toLowerCase().startsWith('japanese')
              ? 'ja'
              : 'en'
        }));
      
      intro = sourcesJson.data.intro?.start && sourcesJson.data.intro?.end
        ? { start: sourcesJson.data.intro.start, end: sourcesJson.data.intro.end }
        : null;
      outro = sourcesJson.data.outro?.start && sourcesJson.data.outro?.end
        ? { start: sourcesJson.data.outro.start, end: sourcesJson.data.outro.end }
        : null;
    }
  }

  try {
    const animeInfoResp = await fetch(`/api/anime?action=info&animeId=${animeId}`);
    console.log('animeInfoResp status:', animeInfoResp.status);
    const animeInfoJson = await animeInfoResp.json();
    console.log('animeInfoJson:', animeInfoJson);

    if (!animeInfoJson.success) {
      console.error('Failed to fetch anime info:', animeInfoJson.error);
      throw new Error(animeInfoJson.error || 'Anime data not found');
    }

    // Format initial subtitles properly
    const initialSubtitles = (animeInfoJson.data?.subtitles || []).map((sub: any) => ({
      src: sub.url || sub.src,
      label: sub.label || sub.lang,
      srclang: sub.srclang || sub.lang || 'en',
      default: sub.default || false
    }));

    const episodesResp = await fetch(`/api/anime?action=episodes&animeId=${animeId}`);
    console.log('episodesResp status:', episodesResp.status);
    const episodesJson = await episodesResp.json();
    console.log('episodesJson:', episodesJson);

    if (!episodesJson.success) {
      console.error('Failed to fetch episodes:', episodesJson.error);
      throw new Error(episodesJson.error || 'Episodes data not found');
    }

    return {
      episodeId,
      anime: animeInfoJson.data.anime,
      episodes: episodesJson.data.episodes || [],
      relatedAnimes: animeInfoJson.data.relatedAnimes || [],
      recommendedAnimes: animeInfoJson.data.recommendedAnimes || [],
      videoSources: [], // This will be populated when sources are fetched
      subtitles: initialSubtitles,
      fetchSources // Export the fetchSources function for use in the page component
    };
  } catch (error) {
    console.error('Error loading page data:', error);
    return {
      error: 'Failed to load page data',
      videoSources: [],
      subtitles: [],
      episodes: [],
      episodeId,
      anime: null,
      relatedAnimes: [],
      recommendedAnimes: [],
      fetchSources: null
    };
  }
};