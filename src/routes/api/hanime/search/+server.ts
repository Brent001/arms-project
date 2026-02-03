import type { RequestHandler } from '@sveltejs/kit';

const API_URL = import.meta.env.VITE_HANIME_API || '';

export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get('query');
  const page = url.searchParams.get('page') || '1';

  if (!query) {
    return new Response(JSON.stringify({ status: 'error', error: 'Missing query parameter' }), { status: 400 });
  }

  try {
    const apiUrl = `${API_URL}/api/hen/mama/search/${encodeURIComponent(query)}/${encodeURIComponent(page)}`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      return new Response(
        JSON.stringify({ status: 'error', error: 'Failed to fetch search data' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiJson = await response.json();

    // Normalize various upstream shapes (e.g. hentaimama wraps results under data.data)
    // Try nested locations: apiJson.data.data, apiJson.data, or apiJson
    const nested = apiJson?.data?.data ?? apiJson?.data ?? apiJson;

    const resultsRaw: any[] = nested?.results || nested?.items || [];
    const pagination = nested?.pagination || nested?.meta || {};

    // Map upstream result fields to the frontend-friendly shape
    const results = resultsRaw.map((item: any) => ({
      id: item.slug || item.id || item.seriesId || '',
      image: item.thumbnailUrl || item.imageUrl || item.featuredImageUrl || item.image || '',
      title: item.title || item.name || '',
      duration: item.duration || item.runTime || null,
      views: item.views || item.viewCount || 0,
      rating: item.rating || null,
      year: item.year || null,
      genres: item.genres || item.categories || []
    }));

    // Extract pagination info; if totalPages is wrong or hasNextPage is true, recgithub
    let totalPages = pagination?.totalPages ?? pagination?.total;
    const currentPage = pagination?.currentPage ?? 1;
    const hasNextPage = pagination?.hasNextPage ?? false;
    const hasPreviousPage = pagination?.hasPreviousPage ?? false;

    // If currentPage >= totalPages but hasNextPage is true, or totalPages is missing, recalculate
    if ((!totalPages || currentPage >= totalPages) && hasNextPage) {
      totalPages = currentPage + 1;
    }
    // If we're on page 2+ but totalPages is 1, there's definitely an issue; ensure it's at least currentPage
    if (currentPage > 1 && totalPages < currentPage) {
      totalPages = currentPage + (hasNextPage ? 1 : 0);
    }
    // Default to at least 1
    totalPages = totalPages ?? 1;

    // Return both a normalized shape and an upstream-like nested shape for compatibility
    const responseBody = {
      status: 'success',
      data: {
        // normalized
        results,
        totalPages,
        // upstream-like shape (some clients expect data.data.results and pagination)
        data: {
          results: resultsRaw,
          pagination
        }
      }
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Unexpected error in hanime search API:', error);
    return new Response(
      JSON.stringify({ status: 'error', error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};