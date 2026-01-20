import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing image url', { status: 400 });
  }

  try {
    const resp = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!resp.ok) {
      return new Response('Failed to fetch image', { status: resp.status });
    }

    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const body = await resp.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Vary': 'Accept-Encoding'
      }
    });
  } catch (err) {
    console.error('Image proxy error:', err);
    return new Response('Failed to fetch image', { status: 500 });
  }
};
