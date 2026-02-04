import type { RequestHandler } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';

const API_URL = import.meta.env.VITE_HANIME_API || '';
const REDIS_URL = import.meta.env.VITE_REDIS_URL;
const REDIS_TOKEN = import.meta.env.VITE_REDIS_TOKEN;

const useRedis = !!REDIS_URL && !!REDIS_TOKEN;
const redis = useRedis
  ? new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! })
  : null;

const CACHE_TTL = 900; // 15 minutes

export const GET: RequestHandler = async ({ url }) => {
  const page = url.searchParams.get('page') || '1';
  const CACHE_KEY = `hanime_tvshows_${page}_v1`;

  // If redis is disabled, fall back to direct fetch and respond
  if (!redis) {
    try {
      const resp = await fetch(`${API_URL}/api/hen/mama/tvshows/${encodeURIComponent(page)}`);
      if (!resp.ok) {
        return new Response(JSON.stringify({ status: 'error', error: 'Failed to fetch tv shows' }), { status: resp.status });
      }

      const apiJson = await resp.json();

      // Extract nested data if present
      const wrapper = apiJson?.data?.data ?? apiJson?.data ?? apiJson;
      const resultsRaw: any[] = wrapper?.results || [];
      const pagination = wrapper?.pagination || {};

      const results = resultsRaw.map((item: any) => ({
        slug: item.slug || item.id || '',
        title: item.title || item.seriesTitle || '',
        posterUrl: item.posterUrl || item.imageUrl || item.image || '',
        year: item.year || item.releaseYear || null,
        rating: item.rating ?? null
      }));

      const normalized = {
        status: 'success',
        data: {
          provider: 'hentaimama',
          type: 'tv-shows-archive',
          data: {
            results,
            pagination: {
              currentPage: pagination?.currentPage ?? parseInt(page, 10) ?? 1,
              totalPages: pagination?.totalPages ?? 1,
              hasNextPage: pagination?.hasNextPage ?? false,
              hasPreviousPage: pagination?.hasPreviousPage ?? false
            }
          }
        },
        timestamp: new Date().toISOString()
      };

      return new Response(JSON.stringify(normalized), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'NONE' } });
    } catch (err) {
      return new Response(JSON.stringify({ status: 'error', error: 'Internal server error' }), { status: 500 });
    }
  }

  // Try cache
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return new Response(JSON.stringify(cached), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' } });
    }

    const resp = await fetch(`${API_URL}/api/hen/mama/tvshows/${encodeURIComponent(page)}`);
    if (!resp.ok) {
      return new Response(JSON.stringify({ status: 'error', error: 'Failed to fetch tv shows' }), { status: resp.status });
    }

    const apiJson = await resp.json();
    const wrapper = apiJson?.data?.data ?? apiJson?.data ?? apiJson;
    const resultsRaw: any[] = wrapper?.results || [];
    const pagination = wrapper?.pagination || {};

    const results = resultsRaw.map((item: any) => ({
      slug: item.slug || item.id || '',
      title: item.title || item.seriesTitle || '',
      posterUrl: item.posterUrl || item.imageUrl || item.image || '',
      year: item.year || item.releaseYear || null,
      rating: item.rating ?? null
    }));

    const normalized = {
      status: 'success',
      data: {
        provider: 'hentaimama',
        type: 'tv-shows-archive',
        data: {
          results,
          pagination: {
            currentPage: pagination?.currentPage ?? parseInt(page, 10) ?? 1,
            totalPages: pagination?.totalPages ?? 1,
            hasNextPage: pagination?.hasNextPage ?? false,
            hasPreviousPage: pagination?.hasPreviousPage ?? false
          }
        }
      },
      timestamp: new Date().toISOString()
    };

    await redis.set(CACHE_KEY, normalized, { ex: CACHE_TTL });

    return new Response(JSON.stringify(normalized), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' } });
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', error: 'Internal server error' }), { status: 500 });
  }
};
