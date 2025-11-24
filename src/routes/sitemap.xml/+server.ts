import type { RequestHandler } from '@sveltejs/kit';

// IMPORTANT: Replace this with your actual domain
const SITE_URL = 'https://arms-stream.netlify.app';

export const GET: RequestHandler = async () => {
  const currentDate = new Date().toISOString().split('T')[0];

  // Static pages with SEO metadata
  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/home', priority: '1.0', changefreq: 'daily' },
    { path: '/top-airing', priority: '0.9', changefreq: 'daily' },
    { path: '/recently-added', priority: '0.8', changefreq: 'daily' },
    { path: '/recently-updated', priority: '0.8', changefreq: 'daily' },
    { path: '/recently-completed', priority: '0.7', changefreq: 'weekly' },
    { path: '/most-favorite', priority: '0.7', changefreq: 'weekly' },
    { path: '/search', priority: '0.6', changefreq: 'monthly' },
  ];

  // Fetch dynamic routes (uncomment and modify as needed)
  /*
  try {
    const animeResponse = await fetch(`${SITE_URL}/api/all-anime`);
    const animeList = await animeResponse.json();
    
    const dynamicAnimeUrls = animeList.map(anime => ({
      path: `/info/${anime.id}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: anime.updatedAt || currentDate
    }));
    
    staticPages.push(...dynamicAnimeUrls);
  } catch (error) {
    console.error('Error fetching dynamic routes:', error);
  }
  */

  const urlEntries = staticPages
    .map(
      ({ path, priority, changefreq }) => `
  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    )
    .join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
>${urlEntries}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};