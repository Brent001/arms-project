import type { RequestHandler } from '@sveltejs/kit';

const M3U8_PROXY = import.meta.env.VITE_M3U8_PROXY?.replace(/\/$/, '');

export const GET: RequestHandler = async ({ url }) => {
  const m3u8Url = url.searchParams.get('url');
  const headersParam = url.searchParams.get('headers');

  if (!m3u8Url) {
    return new Response('Missing m3u8 url', { status: 400 });
  }

  let headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  if (headersParam) {
    try {
      const parsed = JSON.parse(headersParam);
      headers = { ...headers, ...parsed };
    } catch {
      // ignore parse error, fallback to default headers
    }
  }

  try {
    let resp;
    
    // If M3U8_PROXY is configured, use it; otherwise, fetch directly
    if (M3U8_PROXY) {
      const proxyUrl = `${M3U8_PROXY}/m3u8-proxy?url=${encodeURIComponent(m3u8Url)}&headers=${encodeURIComponent(JSON.stringify(headers))}`;
      resp = await fetch(proxyUrl);
    } else {
      // Fall back to direct fetch
      resp = await fetch(m3u8Url, { headers });
    }
    
    const contentType = resp.headers.get('content-type') || 'application/vnd.apple.mpegurl';
    const body = await resp.arrayBuffer();

    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600'
      }
    });
  } catch (err) {
    console.error('M3U8 proxy error:', err);
    return new Response('Failed to fetch m3u8', { status: 500 });
  }
};