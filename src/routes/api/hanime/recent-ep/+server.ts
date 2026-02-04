import type { RequestHandler } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';

const API_URL = import.meta.env.VITE_HANIME_API || '';
const REDIS_URL = import.meta.env.VITE_REDIS_URL;
const REDIS_TOKEN = import.meta.env.VITE_REDIS_TOKEN;

const useRedis = !!REDIS_URL && !!REDIS_TOKEN;
const redis = useRedis
  ? new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! })
  : null;

const CACHE_KEY_PREFIX = 'hanime_recent_ep_v1';
const CACHE_TTL = 900; // 15 minutes

export const GET: RequestHandler = async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const cacheKey = `${CACHE_KEY_PREFIX}_page_${page}`;

  let cached = await redis?.get(cacheKey);

  // Always fetch latest data from the API
  const resp = await fetch(`${API_URL}/api/hen/mama/recent-episodes/${page}`);
  if (!resp.ok) {
    return new Response(JSON.stringify({ status: 'error', error: 'Failed to fetch recent episodes' }), { status: resp.status });
  }
  const apiResponse = await resp.json();

  // Extract the full response with pagination info
  const data = {
    results: apiResponse?.data?.data?.results || [],
    pagination: apiResponse?.data?.data?.pagination || { currentPage: page, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
  };

  // Compare new data with cached data
  if (cached && JSON.stringify(cached) === JSON.stringify(data)) {
    // No new data, return cached
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
    });
  } else {
    // New data, update cache
    await redis?.set(cacheKey, data, { ex: CACHE_TTL });
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': cached ? 'UPDATE' : 'MISS' }
    });
  }
};