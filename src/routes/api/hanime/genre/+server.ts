import type { RequestHandler } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';

const API_URL = import.meta.env.VITE_HANIME_API || '';
const REDIS_URL = import.meta.env.VITE_REDIS_URL;
const REDIS_TOKEN = import.meta.env.VITE_REDIS_TOKEN;

const useRedis = !!REDIS_URL && !!REDIS_TOKEN;
const redis = useRedis
  ? new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! })
  : null;

const CACHE_KEY = 'hanime_genre_list_v1';
const CACHE_TTL = 86400; // 24 hours

export const GET: RequestHandler = async () => {
  if (!redis) {
    try {
      const response = await fetch(`${API_URL}/docs/genre`);
      if (!response.ok) {
        return new Response(
          JSON.stringify({ status: 'error', error: 'Failed to fetch genres' }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const data = await response.json();
      return new Response(
        JSON.stringify(data),
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
    return new Response(
      JSON.stringify(cached),
      { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
    );
  }

  // Cache miss: fetch and cache
  try {
    const response = await fetch(`${API_URL}/docs/genre`);
    if (!response.ok) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'Failed to fetch genres' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const data = await response.json();
    await redis.set(CACHE_KEY, data, { ex: CACHE_TTL });
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ status: 'error', error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};