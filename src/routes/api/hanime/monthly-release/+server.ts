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
  const page = url.searchParams.get('page') || '1';

  const CACHE_KEY = `hanime_monthly_releases_${page}_v1`;

  if (!redis) {
    try {
      const resp = await fetch(`${API_URL}/api/hen/mama/new-monthly/${encodeURIComponent(page)}`);
      if (!resp.ok) {
        return new Response(JSON.stringify({ status: 'error', error: 'Failed to fetch monthly releases' }), { status: resp.status });
      }
      const apiJson = await resp.json();

      // Extract data from nested structure: apiJson.data.data contains results and pagination
      const dataWrapper = apiJson?.data?.data ?? apiJson?.data ?? apiJson;
      const resultsRaw: any[] = dataWrapper?.results || [];
      const pagination = dataWrapper?.pagination || {};

      // Map upstream result fields (seriesTitle, episodeTitle, slug, imageUrl, rating, releaseDate, status) to frontend shape
      const results = resultsRaw.map((item: any) => ({
        id: item.slug || '',
        image: item.imageUrl || '',
        title: item.seriesTitle || '',
        episodeTitle: item.episodeTitle || '',
        releaseDate: item.releaseDate || '',
        rating: item.rating || null,
        duration: '--:--',
        views: 0,
        year: null,
        genres: [],
        status: item.status ?? null
      }));

      // Extract pagination info
      const currentPage = pagination?.currentPage ?? parseInt(page, 10) ?? 1;
      const hasNextPage = pagination?.hasNextPage ?? false;
      let totalPages = pagination?.totalPages ?? 1;

      // Ensure totalPages is at least currentPage
      if (totalPages < currentPage) {
        totalPages = currentPage + (hasNextPage ? 1 : 0);
      }

      return new Response(JSON.stringify({ status: 'success', data: { results, currentPage, totalPages } }), {
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
    const resp = await fetch(`${API_URL}/api/hen/mama/new-monthly/${encodeURIComponent(page)}`);
    if (!resp.ok) {
      return new Response(JSON.stringify({ status: 'error', error: 'Failed to fetch monthly releases' }), { status: resp.status });
    }
    const apiJson = await resp.json();

    // Extract data from nested structure: apiJson.data.data contains results and pagination
    const dataWrapper = apiJson?.data?.data ?? apiJson?.data ?? apiJson;
    const resultsRaw: any[] = dataWrapper?.results || [];
    const pagination = dataWrapper?.pagination || {};

    // Map upstream result fields (seriesTitle, episodeTitle, slug, imageUrl, rating, releaseDate, status) to frontend shape
    const results = resultsRaw.map((item: any) => ({
      id: item.slug || '',
      image: item.imageUrl || '',
      title: item.seriesTitle || '',
      episodeTitle: item.episodeTitle || '',
      releaseDate: item.releaseDate || '',
      rating: item.rating || null,
      duration: '--:--',
      views: 0,
      year: null,
      genres: [],
      status: item.status ?? null
    }));

    // Extract pagination info
    const currentPage = pagination?.currentPage ?? parseInt(page, 10) ?? 1;
    const hasNextPage = pagination?.hasNextPage ?? false;
    let totalPages = pagination?.totalPages ?? 1;

    // Ensure totalPages is at least currentPage
    if (totalPages < currentPage) {
      totalPages = currentPage + (hasNextPage ? 1 : 0);
    }

    const normalizedData = {
      status: 'success',
      data: {
        results,
        currentPage,
        totalPages
      }
    };

    await redis.set(CACHE_KEY, normalizedData, { ex: CACHE_TTL });
    return new Response(JSON.stringify(normalizedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ status: 'error', error: 'Internal server error' }), { status: 500 });
  }
};