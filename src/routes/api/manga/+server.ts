import type { RequestHandler } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';
import { Buffer } from 'node:buffer';

const API_URL = import.meta.env.VITE_CONSUMET_API;

const REDIS_URL = import.meta.env.VITE_REDIS_URL;
const REDIS_TOKEN = import.meta.env.VITE_REDIS_TOKEN;
const useRedis = !!REDIS_URL && !!REDIS_TOKEN;
const redis = useRedis
  ? new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! })
  : null;

const CACHE_TTL = 1800; // 30 minutes
const CACHE_TTL_READ = 432000; // 5 days
const CACHE_TTL_IMAGE = 86400; // 24 hours

interface CachedImageData {
  data: string;
  contentType: string;
}

const ALLOWED_MANGA_PROVIDERS = ['mangahere', 'mangapill'];
const DEFAULT_MANGA_PROVIDER = 'mangahere';

export const GET: RequestHandler = async ({ url }) => {
  const type = url.searchParams.get('type');
  let provider = url.searchParams.get('provider');

  // Validate provider
  if (provider && ALLOWED_MANGA_PROVIDERS.includes(provider)) {
    // Use the requested provider
  } else {
    const requestedProvider = provider;
    provider = DEFAULT_MANGA_PROVIDER;
    if (requestedProvider) {
      console.warn(`Unsupported manga provider "${requestedProvider}" requested. Falling back to "${provider}".`);
    }
  }

  try {
    if (type === 'search') {
      const query = url.searchParams.get('q');
      const page = url.searchParams.get('page') || '1';
      if (!query) {
        return new Response(JSON.stringify({ success: false, error: 'Missing search query' }), { status: 400 });
      }
      const apiUrl = `${API_URL}/meta/anilist-manga/${encodeURIComponent(query)}?page=${page}&provider=${provider}`;
      const resp = await fetch(apiUrl);
      const data = await resp.json();
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    }

    if (type === 'info') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'Missing manga id' }), { status: 400 });
      }
      const CACHE_KEY = `manga_info_${provider}_${id}`;
      if (redis) {
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
          return new Response(JSON.stringify({ success: true, data: cached }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
          });
        }
      }
      const apiUrl = `${API_URL}/meta/anilist-manga/info/${encodeURIComponent(id)}?provider=${provider}`;
      const resp = await fetch(apiUrl);
      const data = await resp.json();
      if (redis) {
        await redis.set(CACHE_KEY, data, { ex: CACHE_TTL });
      }
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': redis ? 'MISS' : 'NONE' }
      });
    }

    if (type === 'read') {
      const chapterId = url.searchParams.get('chapterId');
      if (!chapterId) {
        return new Response(JSON.stringify({ success: false, error: 'Missing chapterId' }), { status: 400 });
      }
      const CACHE_KEY = `manga_read_${provider}_${chapterId}`;
      if (redis) {
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
          return new Response(JSON.stringify({ success: true, data: cached }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
          });
        }
      }
      const apiUrl = `${API_URL}/meta/anilist-manga/read?chapterId=${encodeURIComponent(chapterId)}&provider=${provider}`;
      
      console.log(`Fetching chapter data from: ${apiUrl}`);
      
      const resp = await fetch(apiUrl);
      const data = await resp.json();
      
      console.log(`Chapter data received:`, { 
        provider, 
        chapterId, 
        hasPages: Array.isArray(data?.pages) || Array.isArray(data),
        pageCount: Array.isArray(data?.pages) ? data.pages.length : (Array.isArray(data) ? data.length : 0)
      });
      
      if (redis) {
        await redis.set(CACHE_KEY, data, { ex: CACHE_TTL_READ });
      }
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': redis ? 'MISS' : 'NONE' }
      });
    }

    // Enhanced image proxy
    if (type === 'image') {
      const imageUrl = url.searchParams.get('url');
      let referer = url.searchParams.get('referer');

      if (!imageUrl) {
        return new Response(JSON.stringify({ success: false, error: 'Missing image URL' }), { status: 400 });
      }

      console.log(`Fetching image:`, { provider, imageUrl: imageUrl.substring(0, 100) });

      // Create cache key
      const imageHash = Buffer.from(imageUrl).toString('base64').slice(0, 50);
      const CACHE_KEY = `manga_image_${provider}_${imageHash}`;

      // Determine referer if not provided
      if (!referer) {
        const imageHost = new URL(imageUrl).hostname;
        
        if (provider === 'mangapill' || imageHost.includes('mangapill')) {
          referer = 'https://mangapill.com/';
        } else if (provider === 'mangahere' || imageHost.includes('mangahere')) {
          referer = 'https://www.mangahere.cc/';
        } else if (imageHost.includes('manganelo') || imageHost.includes('manganato')) {
          referer = 'https://manganato.com/';
        } else if (imageHost.includes('mangakakalot')) {
          referer = 'https://mangakakalot.com/';
        } else if (imageHost.includes('mangadex')) {
          referer = 'https://mangadex.org/';
        } else {
          referer = provider === 'mangapill' ? 'https://mangapill.com/' : 'https://www.mangahere.cc/';
        }
      }

      try {
        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
        };

        if (referer) {
          headers['Referer'] = referer;
        }

        // Add origin based on provider
        if (provider === 'mangapill') {
          headers['Origin'] = 'https://mangapill.com';
        } else if (provider === 'mangahere') {
          headers['Origin'] = 'https://www.mangahere.cc';
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const resp = await fetch(imageUrl, {
          headers,
          signal: controller.signal,
          redirect: 'follow',
          mode: 'cors'
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
          console.error(`Image fetch failed: HTTP ${resp.status} for ${imageUrl.substring(0, 100)}`);
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }

        const contentType = resp.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await resp.arrayBuffer();

        if (arrayBuffer.byteLength === 0) {
          throw new Error('Received empty image data');
        }

        console.log(`Image fetched successfully:`, { 
          provider, 
          size: arrayBuffer.byteLength, 
          contentType,
          url: imageUrl.substring(0, 100)
        });

        return new Response(arrayBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'public, max-age=86400',
            'X-Cache': 'NONE',
            'ETag': `"${Buffer.from(imageUrl).toString('base64').slice(0, 16)}"`,
            'Vary': 'Accept-Encoding'
          }
        });

      } catch (err) {
        console.error('Image fetch error:', err, { provider, imageUrl: imageUrl.substring(0, 100) });

        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to fetch image: ${errorMessage}`,
          imageUrl: imageUrl.substring(0, 100) + '...',
          provider
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    return new Response(JSON.stringify({ success: false, error: 'Invalid type parameter' }), { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500 });
  }
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
};