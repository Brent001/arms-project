import type { RequestHandler } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';

const API_URL = import.meta.env.VITE_HANIME_API || '';
const REDIS_URL = import.meta.env.VITE_REDIS_URL;
const REDIS_TOKEN = import.meta.env.VITE_REDIS_TOKEN;

const useRedis = !!REDIS_URL && !!REDIS_TOKEN;
const redis = useRedis
  ? new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! })
  : null;

const CACHE_TTL = 3600; // 1 hour

export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get('q');

  if (!query || query.trim() === '') {
    return new Response(
      JSON.stringify({ status: 'error', error: 'Query parameter "q" is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const cacheKey = `hanime_manga_search_${query.toLowerCase()}`;
  const cached = await redis?.get(cacheKey);

  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
    });
  }

  try {
    const resp = await fetch(`${API_URL}/api/manga/h20/search?q=${encodeURIComponent(query)}`);
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'Failed to fetch manga search results' }),
        { status: resp.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await resp.json();
    await redis?.set(cacheKey, data, { ex: CACHE_TTL });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ status: 'error', error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};