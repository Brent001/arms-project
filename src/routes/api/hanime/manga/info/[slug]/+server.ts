import type { RequestHandler } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';

const API_URL = import.meta.env.VITE_HANIME_API || '';
const REDIS_URL = import.meta.env.VITE_REDIS_URL;
const REDIS_TOKEN = import.meta.env.VITE_REDIS_TOKEN;

const useRedis = !!REDIS_URL && !!REDIS_TOKEN;
const redis = useRedis
  ? new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! })
  : null;

const CACHE_TTL = 7200; // 2 hours

export const GET: RequestHandler = async ({ params }) => {
  const { slug } = params;

  if (!slug || slug.trim() === '') {
    return new Response(
      JSON.stringify({ status: 'error', error: 'Slug parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const cacheKey = `hanime_manga_details_${slug}`;
  const cached = await redis?.get(cacheKey);

  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
    });
  }

  try {
    const resp = await fetch(`${API_URL}/api/manga/h20/details/${encodeURIComponent(slug)}`);
    
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          error: `Failed to fetch manga details: ${resp.statusText}` 
        }),
        { status: resp.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await resp.json();
    
    // Validate response structure
    if (!data.status || data.status !== 'success' || !data.data) {
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          error: 'Invalid response structure from API' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total chapters dynamically from chapters array if not provided
    if (data.data.chapters && Array.isArray(data.data.chapters)) {
      const totalChapters = data.data.chapters.length;
      data.data.totalChapters = totalChapters;
    }

    // Cache the successful response
    await redis?.set(cacheKey, data, { ex: CACHE_TTL });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });
  } catch (error) {
    console.error(`Error fetching manga details for slug "${slug}":`, error);
    
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        error: 'Internal server error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};