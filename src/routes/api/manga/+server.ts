import type { RequestHandler } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';
import { Buffer } from 'node:buffer'; // Import Buffer explicitly

const API_URL = import.meta.env.VITE_CONSUMET_API;

const REDIS_URL = import.meta.env.VITE_REDIS_URL;
const REDIS_TOKEN = import.meta.env.VITE_REDIS_TOKEN;
const useRedis = !!REDIS_URL && !!REDIS_TOKEN;
const redis = useRedis
  ? new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! })
  : null;

const CACHE_TTL = 1800; // 30 minutes
const CACHE_TTL_READ = 432000; // 5 days in seconds
const CACHE_TTL_IMAGE = 86400; // 24 hours for images

// Define an interface for the cached image data
interface CachedImageData {
  data: string; // Base64 encoded image data
  contentType: string;
}

// Define allowed providers and a default
const ALLOWED_MANGA_PROVIDERS = ['mangahere', 'mangapill'];
const DEFAULT_MANGA_PROVIDER = 'mangahere'; // mangahere will be the default if no valid provider is specified

export const GET: RequestHandler = async ({ url }) => {
  const type = url.searchParams.get('type'); // 'search', 'info', 'read', or 'image'
  let provider = url.searchParams.get('provider');

  // Validate and set the provider. If not specified or not allowed, use the default.
  if (provider && ALLOWED_MANGA_PROVIDERS.includes(provider)) {
    // Use the requested provider if it's allowed
  } else {
    // If provider is not specified or not in the allowed list, use the default
    const requestedProvider = provider; // Store the originally requested provider for the warning
    provider = DEFAULT_MANGA_PROVIDER;
    if (requestedProvider) { // Only warn if an unsupported provider was explicitly requested
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
      const resp = await fetch(apiUrl);
      const data = await resp.json();
      if (redis) {
        await redis.set(CACHE_KEY, data, { ex: CACHE_TTL_READ });
      }
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': redis ? 'MISS' : 'NONE' }
      });
    }

    // Enhanced image proxy with better CORS handling and caching
    if (type === 'image') {
      const imageUrl = url.searchParams.get('url');
      let referer = url.searchParams.get('referer'); // Keep original referer if provided

      if (!imageUrl) {
        return new Response(JSON.stringify({ success: false, error: 'Missing image URL' }), { status: 400 });
      }

      // Create cache key for image
      const CACHE_KEY = `manga_image_${Buffer.from(imageUrl).toString('base64').slice(0, 50)}`;

      // Try to get cached image first
      if (redis) {
        try {
          const cached = await redis.get(CACHE_KEY) as CachedImageData | null; // Type assertion here
          if (cached && cached.data && cached.contentType) {
            const imageData = Buffer.from(cached.data, 'base64');
            return new Response(imageData, {
              status: 200,
              headers: {
                'Content-Type': cached.contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400',
                'X-Cache': 'HIT'
              }
            });
          }
        } catch (cacheError) {
          console.warn('Cache read error:', cacheError);
        }
      }

      // Determine referer based on image URL or provider
      // Only set referer if it wasn't explicitly provided in the URL
      if (!referer) {
        const imageHost = new URL(imageUrl).hostname;
        
        // Set appropriate referers based on common manga image hosts
        if (imageHost.includes('mangapill')) {
          referer = 'https://mangapill.com/';
        } else if (imageHost.includes('mangahere')) {
          referer = 'https://www.mangahere.cc/';
        } else if (imageHost.includes('manganelo') || imageHost.includes('manganato')) {
          referer = 'https://manganato.com/';
        } else if (imageHost.includes('mangakakalot')) {
          referer = 'https://mangakakalot.com/';
        } else if (imageHost.includes('mangadex')) {
          referer = 'https://mangadex.org/';
        } else {
          // Default referer
          referer = 'https://mangapill.com/'; // Keep mangapill as a general default for unknown image hosts
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
        };

        if (referer) {
          headers['Referer'] = referer;
        }

        // Add origin header for some sites
        const imageHost = new URL(imageUrl).hostname;
        if (imageHost.includes('mangapill')) {
          headers['Origin'] = 'https://mangapill.com';
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const resp = await fetch(imageUrl, {
          headers,
          signal: controller.signal,
          // Add these options for better performance
          redirect: 'follow',
          mode: 'cors'
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }

        const contentType = resp.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await resp.arrayBuffer();

        // Cache the image if Redis is available
        if (redis && arrayBuffer.byteLength > 0) {
          try {
            const imageData = Buffer.from(arrayBuffer).toString('base64');
            await redis.set(CACHE_KEY, {
              data: imageData,
              contentType: contentType
            } satisfies CachedImageData, { ex: CACHE_TTL_IMAGE }); // Type assertion for caching
          } catch (cacheError) {
            console.warn('Cache write error:', cacheError);
          }
        }

        return new Response(arrayBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'public, max-age=86400',
            'X-Cache': 'MISS',
            // Add these headers for better caching
            'ETag': `"${Buffer.from(imageUrl).toString('base64').slice(0, 16)}"`,
            'Vary': 'Accept-Encoding'
          }
        });

      } catch (err) {
        console.error('Image fetch error:', err);

        // Return a more specific error response
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to fetch image: ${errorMessage}`,
          imageUrl: imageUrl.substring(0, 100) + '...' // Truncated URL for debugging
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