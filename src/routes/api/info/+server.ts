import type { RequestHandler } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';

const API_URL = import.meta.env.VITE_ANIME_API || '';
const REDIS_URL = import.meta.env.VITE_REDIS_URL;
const REDIS_TOKEN = import.meta.env.VITE_REDIS_TOKEN;

const useRedis = !!REDIS_URL && !!REDIS_TOKEN;
const redis = useRedis
  ? new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! })
  : null;

function secondsUntilMidnight(timezone = 'Asia/Tokyo') {
  const now = new Date();
  const tzNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const tomorrow = new Date(tzNow);
  tomorrow.setHours(24, 0, 0, 0);
  return Math.floor((tomorrow.getTime() - tzNow.getTime()) / 1000);
}

export const GET: RequestHandler = async ({ url }) => {
  const animeId = url.searchParams.get('animeId');
  if (!animeId) {
    return new Response(JSON.stringify({ success: false, error: 'Anime ID required' }), { status: 400 });
  }

  const CACHE_KEY = `anime_info_${animeId}`;

  // If Redis is not configured, passthrough mode (no caching)
  if (!redis) {
    console.warn('[INFO API] Redis not configured, passthrough mode.');
    const resp = await fetch(`${API_URL}/api/v2/hianime/anime/${animeId}`);
    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'NONE' }
    });
  }

  // Try cache first: only fetch from API if cache is missing
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
    });
  }

  // Cache miss: fetch from API and cache the result
  const resp = await fetch(`${API_URL}/api/v2/hianime/anime/${animeId}`);
  const data = await resp.json();
  await redis.set(CACHE_KEY, data, { ex: secondsUntilMidnight('Asia/Tokyo') });

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
  });
};