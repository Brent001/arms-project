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

// ─── Shared Helpers ─────────────────────────────────────────────────────────

/** The single endpoint that actually returns genres */
const GENRES_ENDPOINT = `${API_URL}/api/hen/mama/genres`;

/**
 * Pulls a string[] out of whatever shape the upstream API (or cache) returns.
 * Handles:
 *   { data: { genres: [...] } }
 *   { data: { data: { genres: [...] } } }   ← already-formatted cached object
 *   [...]                                    ← bare array
 */
function extractGenres(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw;

  if (typeof raw === 'object' && raw !== null && 'data' in raw) {
    const d = (raw as Record<string, unknown>).data;

    // nested: raw.data.data.genres  (already-formatted response in cache)
    if (typeof d === 'object' && d !== null && 'data' in d) {
      const dd = (d as Record<string, unknown>).data;
      if (typeof dd === 'object' && dd !== null && 'genres' in dd && Array.isArray((dd as Record<string, unknown>).genres)) {
        return (dd as Record<string, unknown>).genres as string[];
      }
    }

    // single level: raw.data.genres
    if (typeof d === 'object' && d !== null && 'genres' in d && Array.isArray((d as Record<string, unknown>).genres)) {
      return (d as Record<string, unknown>).genres as string[];
    }
  }

  return [];
}

/** Wraps a genre list into the exact response shape the client expects */
function formatGenresResponse(genres: string[], provider = 'hentaimama') {
  return {
    status: 'success',
    data: {
      provider,
      type: 'genre-list',
      data: {
        totalCount: genres.length,
        genres,
      },
    },
    timestamp: new Date().toISOString(),
  };
}

/** Fire-and-forget fetch → extract → format pipeline */
async function fetchAndFormat(): Promise<{ genres: string[]; formatted: ReturnType<typeof formatGenresResponse> }> {
  const response = await fetch(GENRES_ENDPOINT);

  if (!response.ok) {
    throw new Response(
      JSON.stringify({ status: 'error', error: 'Failed to fetch genres' }),
      { status: response.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const raw = await response.json();
  const genres = extractGenres(raw);
  const formatted = formatGenresResponse(genres);
  return { genres, formatted };
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export const GET: RequestHandler = async () => {
  // ── No Redis configured → fetch directly, no caching ──────────────────
  if (!redis) {
    try {
      const { formatted } = await fetchAndFormat();
      return new Response(JSON.stringify(formatted), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'NONE' },
      });
    } catch (err) {
      // fetchAndFormat throws a Response on non-ok status
      if (err instanceof Response) return err;
      return new Response(
        JSON.stringify({ status: 'error', error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // ── Redis available → try cache first ──────────────────────────────────
  try {
    const cached = await redis.get(CACHE_KEY);

    if (cached) {
      // Cache might already be the fully-formatted object OR a raw upstream blob.
      // extractGenres handles both; if it's already formatted we just re-wrap
      // (timestamp refreshes, which is fine).
      const genres = extractGenres(cached);

      // If genres are non-empty, trust the cache; otherwise fall through to fetch.
      if (genres.length > 0) {
        return new Response(JSON.stringify(formatGenresResponse(genres)), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        });
      }
    }

    // ── Cache miss (or empty genres in cache) → fetch, cache, return ─────
    const { formatted } = await fetchAndFormat();
    await redis.set(CACHE_KEY, formatted, { ex: CACHE_TTL });

    return new Response(JSON.stringify(formatted), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return new Response(
      JSON.stringify({ status: 'error', error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};