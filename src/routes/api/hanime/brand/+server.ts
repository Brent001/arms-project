import type { RequestHandler } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';

const API_URL = import.meta.env.VITE_HANIME_API || '';
const REDIS_URL = import.meta.env.VITE_REDIS_URL;
const REDIS_TOKEN = import.meta.env.VITE_REDIS_TOKEN;

const useRedis = !!REDIS_URL && !!REDIS_TOKEN;
const redis = useRedis
  ? new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! })
  : null;

const CACHE_KEY = 'hanime_brand_list_v1';
const CACHE_TTL = 86400; // 24 hours

export const GET: RequestHandler = async () => {
  // Helper to format the response as required
  function formatStudiosResponse(results: any[], provider = 'hentaimama') {
    return {
      status: 'success',
      data: {
        provider,
        type: 'studio-list',
        data: {
          totalCount: results.length,
          results,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  if (!redis) {
    try {
      const response = await fetch(`${API_URL}/api/hen/mama/studios`);
      if (!response.ok) {
        return new Response(
          JSON.stringify({ status: 'error', error: 'Failed to fetch brands' }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const raw = await response.json();
      // Try to extract results from the raw response
      let results: any[] = [];
      if (raw?.data?.data?.results) {
        results = raw.data.data.results;
      } else if (raw?.data?.results) {
        results = raw.data.results;
      } else if (Array.isArray(raw)) {
        results = raw;
      }
      const formatted = formatStudiosResponse(results);
      return new Response(
        JSON.stringify(formatted),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'NONE' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Try cache first
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    // Type guard for cached object
    if (
      typeof cached === 'object' &&
      cached !== null &&
      'status' in cached &&
      cached.status === 'success' &&
      'data' in cached &&
      typeof cached.data === 'object' &&
      cached.data !== null &&
      'data' in cached.data &&
      typeof cached.data.data === 'object' &&
      cached.data.data !== null &&
      'results' in cached.data.data &&
      Array.isArray(cached.data.data.results)
    ) {
      return new Response(
        JSON.stringify(cached),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
      );
    }
    // Otherwise, try to format
    let results: any[] = [];
    if (
      typeof cached === 'object' &&
      cached !== null &&
      'data' in cached &&
      typeof cached.data === 'object' &&
      cached.data !== null &&
      'results' in cached.data &&
      Array.isArray(cached.data.results)
    ) {
      results = cached.data.results;
    } else if (Array.isArray(cached)) {
      results = cached;
    }
    const formatted = formatStudiosResponse(results);
    return new Response(
      JSON.stringify(formatted),
      { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
    );
  }

  // Cache miss: fetch and cache
  try {
    const response = await fetch(`${API_URL}/api/hen/mama/studios`);
    if (!response.ok) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'Failed to fetch brands' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const raw = await response.json();
    let results: any[] = [];
    if (raw?.data?.data?.results) {
      results = raw.data.data.results;
    } else if (raw?.data?.results) {
      results = raw.data.results;
    } else if (Array.isArray(raw)) {
      results = raw;
    }
    const formatted = formatStudiosResponse(results);
    await redis.set(CACHE_KEY, formatted, { ex: CACHE_TTL });
    return new Response(
      JSON.stringify(formatted),
      { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ status: 'error', error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};