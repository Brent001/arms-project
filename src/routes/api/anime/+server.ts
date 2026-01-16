import type { RequestHandler } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';

// Configuration
const CONFIG = {
  API_URL: import.meta.env.VITE_ANIME_API || '',
  M3U8_PROXY: import.meta.env.VITE_M3U8_PROXY,
  M3U8_PROXY_HD1: import.meta.env.VITE_M3U8_PROXY_HD1,
  M3U8_PROXY_HD3: import.meta.env.VITE_M3U8_PROXY_HD3,
  REFERERS: [
    'https://rapid-cloud.co/',
    'https://hianime.to/'
  ],
  SERVERS_TO_CACHE: ['hd-1', 'hd-2', 'hd-3'],
  CACHE_DURATION: {
    INFO: (tz: string) => secondsUntilMidnight(tz),
    SOURCES: 172800, // 2 days
    ERRORS: 7200 // 2 hours
  }
} as const;

// Redis setup
const redis = initializeRedis();

function initializeRedis() {
  const REDIS_URL = import.meta.env.VITE_REDIS_URL;
  const REDIS_TOKEN = import.meta.env.VITE_REDIS_TOKEN;
  return REDIS_URL && REDIS_TOKEN 
    ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
    : null;
}

// Utility functions
const createErrorResponse = (message: string, status: number) => 
  new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const createSuccessResponse = (data: any, cacheStatus = 'NONE') =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': cacheStatus
    }
  });

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

function secondsUntilMidnight(timezone = 'Asia/Tokyo'): number {
  const now = new Date();
  const tzNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const tomorrow = new Date(tzNow);
  tomorrow.setHours(24, 0, 0, 0);
  return Math.floor((tomorrow.getTime() - tzNow.getTime()) / 1000);
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxAttempts = CONFIG.REFERERS.length
) {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const referer = CONFIG.REFERERS[attempt - 1];
    console.log(`Attempt ${attempt}: Using referer ${referer}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Referer': referer,
          'Origin': referer.slice(0, -1),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      if (response.ok) return { response, referer };
      
      const errorText = await response.text();
      lastError = new Error(`HTTP ${response.status}: ${errorText}`);
      console.error(`Attempt ${attempt} failed:`, errorText);
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} error:`, error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500 * attempt));
  }
  
  throw lastError || new Error('All referers failed');
}

// Cache helpers
async function getFromCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  return await redis.get(key) as T | null;
}

async function setInCache(key: string, value: any, expirySeconds: number): Promise<void> {
  if (!redis) return;
  await redis.set(key, value, { ex: expirySeconds });
}

async function deleteFromCache(keys: string[]): Promise<void> {
  if (!redis) return;
  await Promise.all(keys.map(key => redis.del(key)));
}

// Action handlers
async function handleInfo(animeId: string) {
  const cacheKey = `anime_info_${animeId}`;
  const cached = await getFromCache(cacheKey);
  
  if (cached) {
    return createSuccessResponse(cached, 'HIT');
  }

  const infoUrl = `${CONFIG.API_URL}/api/v2/hianime/anime/${encodeURIComponent(animeId)}`;
  const { response } = await fetchWithRetry(infoUrl);
  const data = await response.json();
  
  await setInCache(cacheKey, data, CONFIG.CACHE_DURATION.INFO('Asia/Tokyo'));
  
  return createSuccessResponse(data, 'MISS');
}

async function handleEpisodes(animeId: string) {
  const episodesUrl = `${CONFIG.API_URL}/api/v2/hianime/anime/${encodeURIComponent(animeId)}/episodes`;
  const { response } = await fetchWithRetry(episodesUrl);
  const data = await response.json();
  
  return createSuccessResponse(data);
}

async function handleServers(animeEpisodeId: string) {
  const serversUrl = `${CONFIG.API_URL}/api/v2/hianime/episode/servers?animeEpisodeId=${encodeURIComponent(animeEpisodeId)}`;
  const { response } = await fetchWithRetry(serversUrl);
  const data = await response.json();
  
  return createSuccessResponse(data);
}

function buildProxyUrl(sourceUrl: string, referer: string, server: string): string {
  const proxyHeaders = JSON.stringify({
    Referer: referer,
    Origin: 'https://hianime.to',
  });
  
  let proxyBase: string;
  
  if (server === 'hd-1') {
    proxyBase = (CONFIG.M3U8_PROXY_HD1 || CONFIG.M3U8_PROXY).replace(/\/$/, '');
  } else if (server === 'hd-3') {
    proxyBase = (CONFIG.M3U8_PROXY_HD3 || CONFIG.M3U8_PROXY).replace(/\/$/, '');
  } else {
    proxyBase = CONFIG.M3U8_PROXY.replace(/\/$/, '');
  }
  
  return `${proxyBase}/m3u8-proxy?url=${encodeURIComponent(sourceUrl)}&headers=${encodeURIComponent(proxyHeaders)}`;
}

function processSourcesForResponse(sources: any[], referer: string, server: string) {
  return sources.map((source: any) => {
    if (source.url?.endsWith('.m3u8') && isValidUrl(source.url)) {
      return {
        ...source,
        url: buildProxyUrl(source.url, referer, server)
      };
    }
    return source;
  });
}

async function fetchServerSources(animeEpisodeId: string, server: string, category: string) {
  const sourcesUrl = `${CONFIG.API_URL}/api/v2/hianime/episode/sources?${new URLSearchParams({
    animeEpisodeId: decodeURIComponent(animeEpisodeId),
    server,
    category
  })}`;

  try {
    const { response, referer } = await fetchWithRetry(sourcesUrl);
    const json = await response.json();

    if (!json?.success || !json.data?.sources || response.status === 500) {
      return { 
        error: 'no_sources', 
        server, 
        serverUrl: sourcesUrl 
      };
    }

    return {
      ...json.data,
      usedReferer: referer,
      server,
      serverUrl: sourcesUrl,
      iframe: json.data.iframe // Explicitly include iframe from API response
    };
  } catch (err) {
    return { 
      error: 'fetch_failed', 
      server, 
      serverUrl: sourcesUrl 
    };
  }
}

async function handleSources(animeEpisodeId: string, server: string, category: string) {
  const requestedServer = server.toLowerCase() as 'hd-1' | 'hd-2' | 'hd-3';
  
  // Generate cache keys for all servers
  const cacheKeys = CONFIG.SERVERS_TO_CACHE.map(s => 
    `anime_sources_${animeEpisodeId}_${s}_${category}`
  );

  // Check cache for HD-2 and HD-3
  if (requestedServer === 'hd-2' || requestedServer === 'hd-3') {
    const cacheIndex = CONFIG.SERVERS_TO_CACHE.indexOf(requestedServer as typeof CONFIG.SERVERS_TO_CACHE[number]);
    const cached = await getFromCache(cacheKeys[cacheIndex]);
    if (cached) {
      return createSuccessResponse({ success: true, data: cached }, 'HIT');
    }
  }

  // Fetch sources for all servers
  const results = await Promise.all(
    CONFIG.SERVERS_TO_CACHE.map(s => fetchServerSources(animeEpisodeId, s, category))
  );

  // Cache HD-2 and HD-3 results
  for (let i = 1; i < results.length; i++) { // Start from index 1 to skip HD-1
    const result = results[i];
    if (result) {
      const expiry = result.error 
        ? CONFIG.CACHE_DURATION.ERRORS 
        : CONFIG.CACHE_DURATION.SOURCES;
      await setInCache(cacheKeys[i], result, expiry);
    }
  }

  // Find and process the requested server's result
  const serverIndex = CONFIG.SERVERS_TO_CACHE.indexOf(requestedServer as typeof CONFIG.SERVERS_TO_CACHE[number]);
  const result = results[serverIndex];

  if (!result) {
    return createErrorResponse('No sources found for requested server', 500);
  }

  // Process sources for response (add proxy URLs)
  if (result.sources && !result.error) {
    result.sources = processSourcesForResponse(result.sources, result.usedReferer, requestedServer);
  }

  const cacheStatus = (requestedServer === 'hd-2' || requestedServer === 'hd-3') ? 'MISS' : 'NONE';
  return createSuccessResponse({ 
    success: true, 
    data: {
      ...result,
      iframe: result.iframe // Ensure iframe is included in the response
    } 
  }, cacheStatus);
}

async function handleDeleteSourceCache(animeEpisodeId: string, category: string) {
  if (!redis) {
    return createErrorResponse('Redis not configured', 500);
  }

  const keys = CONFIG.SERVERS_TO_CACHE.map(
    s => `anime_sources_${animeEpisodeId}_${s}_${category}`
  );
  
  await deleteFromCache(keys);
  
  return createSuccessResponse({ success: true, deleted: keys });
}

// Main request handler
export const GET: RequestHandler = async ({ url }) => {
  if (!CONFIG.API_URL) {
    return createErrorResponse('API configuration error', 500);
  }

  const params = Object.fromEntries(url.searchParams);
  const { 
    action, 
    animeId, 
    animeEpisodeId, 
    server = 'hd-1', 
    category = 'sub' 
  } = params;

  if (!action) {
    return createErrorResponse('Action parameter required', 400);
  }

  try {
    switch (action) {
      case 'info':
        if (!animeId) return createErrorResponse('animeId required', 400);
        return await handleInfo(animeId);
      
      case 'episodes':
        if (!animeId) return createErrorResponse('animeId required', 400);
        return await handleEpisodes(animeId);
      
      case 'servers':
        if (!animeEpisodeId) return createErrorResponse('animeEpisodeId required', 400);
        return await handleServers(animeEpisodeId);
      
      case 'sources':
        if (!animeEpisodeId) return createErrorResponse('animeEpisodeId required', 400);
        return await handleSources(animeEpisodeId, server, category);
      
      case 'delete-source-cache':
        if (!animeEpisodeId) return createErrorResponse('animeEpisodeId required', 400);
        return await handleDeleteSourceCache(animeEpisodeId, category);
      
      default:
        return createErrorResponse(`Invalid action: ${action}`, 400);
    }
  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(message, 500);
  }
};