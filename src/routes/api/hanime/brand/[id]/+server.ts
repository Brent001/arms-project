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
  const id = params.id;
  const page = url.searchParams.get('page') || '1';

  if (!id) {
    console.error('Missing brand id parameter');
    return new Response(JSON.stringify({ status: 'error', error: 'Missing brand id parameter' }), { status: 400 });
  }

  const CACHE_KEY = `hanime_brand_${id}_${page}_v1`;

  try {
    if (!redis) {
      console.log('Redis not configured, fetching from API');
      const resp = await fetch(`${API_URL}/api/hen/mama/studios/${encodeURIComponent(id)}/${encodeURIComponent(page)}`);
      if (!resp.ok) {
        console.error('API fetch failed', resp.status);
        return new Response(JSON.stringify({ status: 'error', error: 'Failed to fetch brand data' }), { status: resp.status });
      }
      const data = await resp.json();

      // Patch: ensure each result has a duration property
      if (data?.data?.results) {
        data.data.results = data.data.results.map((item: any) => ({
          duration: null, // or '' if you prefer
          ...item
        }));
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'NONE' }
      });
    }

    // Try cache first
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      console.log('Cache HIT');
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      });
    }

    // Cache miss: fetch and cache
    console.log('Cache MISS, fetching from API');
    const resp = await fetch(`${API_URL}/api/hen/mama/studios/${encodeURIComponent(id)}/${encodeURIComponent(page)}`);
    if (!resp.ok) {
      console.error('API fetch failed', resp.status);
      return new Response(JSON.stringify({ status: 'error', error: 'Failed to fetch brand data' }), { status: resp.status });
    }
    const data = await resp.json();

    // Patch: ensure each result has a duration property
    if (data?.data?.results) {
      data.data.results = data.data.results.map((item: any) => ({
        duration: null, // or '' if you prefer
        ...item
      }));
    }

    if (!redis) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'NONE' }
      });
    }

    await redis.set(CACHE_KEY, data, { ex: CACHE_TTL });
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });
  } catch (error) {
    console.error('Internal server error', error);
    return new Response(JSON.stringify({ status: 'error', error: 'Internal server error' }), { status: 500 });
  }
};