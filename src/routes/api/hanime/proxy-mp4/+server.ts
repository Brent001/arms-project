import type { RequestHandler } from '@sveltejs/kit';

// Rotate between realistic user agents to avoid detection
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

// Common accept headers that browsers send
const BROWSER_ACCEPT_HEADERS = {
  video: 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
  default: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  encoding: 'gzip, deflate, br',
  language: 'en-US,en;q=0.9'
};

// Get a random user agent for rotation
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Generate realistic browser fingerprint headers
function getBrowserHeaders(videoUrl: string, referer?: string): Record<string, string> {
  // Default to nhplayer.com as origin and referer
  const defaultReferer = 'https://nhplayer.com/';
  const defaultOrigin = 'https://nhplayer.com';
  
  const refererToUse = referer || defaultReferer;
  
  // Extract origin from custom referer if provided, otherwise use nhplayer.com
  let originToUse = defaultOrigin;
  try {
    if (referer) {
      originToUse = new URL(referer).origin;
    }
  } catch {
    originToUse = defaultOrigin;
  }

  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': BROWSER_ACCEPT_HEADERS.video,
    'Accept-Language': BROWSER_ACCEPT_HEADERS.language,
    'Accept-Encoding': BROWSER_ACCEPT_HEADERS.encoding,
    'Referer': refererToUse,
    'Origin': originToUse,
    'DNT': '1',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Upgrade-Insecure-Requests': '1'
  };
}

// Handle cookie forwarding for authenticated resources
function extractCookies(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  // Filter out potentially problematic cookies
  const cookies = cookieHeader.split(';').map(c => c.trim());
  return cookies.filter(c => !c.toLowerCase().startsWith('__host-')).join('; ');
}

// Handle OPTIONS preflight requests
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range, Cookie, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
};

export const GET: RequestHandler = async ({ url, request }) => {
  const videoUrl = url.searchParams.get('url');

  if (!videoUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validate URL
  try {
    new URL(videoUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get custom referer from query params (full page URL)
    const customReferer = url.searchParams.get('referer');
    
    // Get custom cookies from query params for authenticated resources
    const customCookies = url.searchParams.get('cookies');
    
    // Build headers with browser fingerprinting
    const fetchHeaders = getBrowserHeaders(videoUrl, customReferer || undefined);

    // Forward Range header for video seeking support
    const incomingRange = request.headers.get('range');
    if (incomingRange) {
      fetchHeaders['Range'] = incomingRange;
    }

    // Forward cookies if provided (for authenticated content)
    if (customCookies) {
      fetchHeaders['Cookie'] = customCookies;
    } else {
      // Try to extract cookies from incoming request
      const incomingCookies = extractCookies(request.headers.get('cookie'));
      if (incomingCookies) {
        fetchHeaders['Cookie'] = incomingCookies;
      }
    }

    // Forward authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      fetchHeaders['Authorization'] = authHeader;
    }

    // Fetch with timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let resp: Response;
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        resp = await fetch(videoUrl, {
          method: 'GET',
          headers: fetchHeaders,
          signal: controller.signal,
          redirect: 'follow' // Follow redirects automatically
        });

        clearTimeout(timeoutId);

        // If we get a 403/401, try with different user agent
        if ((resp.status === 403 || resp.status === 401) && retries < maxRetries) {
          retries++;
          fetchHeaders['User-Agent'] = getRandomUserAgent();
          continue;
        }

        break;
      } catch (error) {
        if (retries >= maxRetries) throw error;
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      }
    }

    clearTimeout(timeoutId);

    // Handle non-successful responses (except 206 Partial Content)
    if (!resp.ok && resp.status !== 206) {
      // Try to get error details
      let errorDetails = `${resp.status} ${resp.statusText}`;
      try {
        const errorText = await resp.text();
        if (errorText.length < 200) errorDetails += `: ${errorText}`;
      } catch {}

      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch video: ${errorDetails}`,
          status: resp.status
        }),
        { 
          status: resp.status >= 500 ? 502 : resp.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Build response headers
    const responseHeaders: Record<string, string> = {
      // CORS headers - critical for cross-origin requests
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range, Cookie, Authorization',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Accept-Ranges',
      
      // Caching
      'Cache-Control': 'public, max-age=86400, immutable',
      'Vary': 'Origin, Range'
    };

    // Mirror important headers from upstream
    const headersToMirror = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'content-encoding',
      'etag',
      'last-modified'
    ];

    for (const header of headersToMirror) {
      const value = resp.headers.get(header);
      if (value) {
        // Normalize header names to proper case
        const normalizedHeader = header.split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join('-');
        responseHeaders[normalizedHeader] = value;
      }
    }

    // Ensure Accept-Ranges is set for video streaming
    if (!responseHeaders['Accept-Ranges']) {
      responseHeaders['Accept-Ranges'] = 'bytes';
    }

    // Handle content encoding - if the response is compressed, forward it
    // The browser will handle decompression
    const contentEncoding = resp.headers.get('content-encoding');
    if (contentEncoding) {
      responseHeaders['Content-Encoding'] = contentEncoding;
    }

    return new Response(resp.body, {
      status: resp.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Proxy error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('aborted');
    
    return new Response(
      JSON.stringify({ 
        error: isTimeout ? 'Request timeout' : 'Internal server error',
        details: errorMessage
      }),
      { 
        status: isTimeout ? 504 : 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
};

// HEAD support for checking file existence
export const HEAD: RequestHandler = async ({ url, request }) => {
  const videoUrl = url.searchParams.get('url');

  if (!videoUrl) {
    return new Response(null, { status: 400 });
  }

  try {
    const customReferer = url.searchParams.get('referer');
    const fetchHeaders = getBrowserHeaders(videoUrl, customReferer || undefined);

    const resp = await fetch(videoUrl, {
      method: 'HEAD',
      headers: fetchHeaders
    });

    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Type, Accept-Ranges'
    };

    const headersToMirror = ['content-type', 'content-length', 'accept-ranges'];
    for (const header of headersToMirror) {
      const value = resp.headers.get(header);
      if (value) {
        headers[header.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-')] = value;
      }
    }

    return new Response(null, {
      status: resp.status,
      headers
    });
  } catch (error) {
    return new Response(null, { status: 500 });
  }
};