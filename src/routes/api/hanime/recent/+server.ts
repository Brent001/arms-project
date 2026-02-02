import type { RequestHandler } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';

const API_URL = import.meta.env.VITE_HANIME_API || '';
const REDIS_URL = import.meta.env.VITE_REDIS_URL;
const REDIS_TOKEN = import.meta.env.VITE_REDIS_TOKEN;

const useRedis = !!REDIS_URL && !!REDIS_TOKEN;
const redis = useRedis
  ? new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! })
  : null;

const CACHE_KEY = 'hanime_recent_v1';
const CACHE_TTL = 900; // 15 minutes

export const GET: RequestHandler = async () => {
  let cached = await redis?.get(CACHE_KEY);

  // Always fetch latest data
  const resp = await fetch(`${API_URL}/api/hen/mama/recent`);
  if (!resp.ok) {
    return new Response(JSON.stringify({ status: 'error', error: 'Failed to fetch recent data' }), { status: resp.status });
  }
  const data = await resp.json();

  // Compare new data with cached data
  if (cached && JSON.stringify(cached) === JSON.stringify(data)) {
    // No new data, return cached
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
    });
  } else {
    // New data, update cache
    await redis?.set(CACHE_KEY, data, { ex: CACHE_TTL });
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': cached ? 'UPDATE' : 'MISS' }
    });
  }
};