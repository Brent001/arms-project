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

export const GET: RequestHandler = async ({ params, url }) => {
  const genre = params.genre;
  const page = url.searchParams.get('page') || '1';

  if (!genre) {
    return new Response(JSON.stringify({ status: 'error', error: 'Missing genre parameter' }), { status: 400 });
  }

  const CACHE_KEY = `hanime_genre_${genre}_${page}_v1`;

  if (!redis) {
    try {
      const resp = await fetch(`${API_URL}/api/hen/tv/genre/${encodeURIComponent(genre)}/${encodeURIComponent(page)}`);
      if (!resp.ok) {
        return new Response(JSON.stringify({ status: 'error', error: 'Failed to fetch genre data' }), { status: resp.status });
      }
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'NONE' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ status: 'error', error: 'Internal server error' }), { status: 500 });
    }
  }

  // Try cache first
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
    });
  }

  // Cache miss: fetch and cache
  try {
    const resp = await fetch(`${API_URL}/api/hen/tv/genre/${encodeURIComponent(genre)}/${encodeURIComponent(page)}`);
    if (!resp.ok) {
      return new Response(JSON.stringify({ status: 'error', error: 'Failed to fetch genre data' }), { status: resp.status });
    }
    const data = await resp.json();
    await redis.set(CACHE_KEY, data, { ex: CACHE_TTL });
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ status: 'error', error: 'Internal server error' }), { status: 500 });
  }
};