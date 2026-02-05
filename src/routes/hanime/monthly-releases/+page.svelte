<script lang="ts">
  import Navbar from '$lib/components/hanime/Navbar.svelte';
  import Footer from '$lib/components/hanime/Footer.svelte';
  import AdultWarning from '$lib/components/hanime/AdultWarning.svelte';
  import { goto } from '$app/navigation';
  import { page, navigating } from '$app/stores';
  import { get } from 'svelte/store';
  import { onMount, onDestroy } from 'svelte';

  export let data: {
    title: string;
    animes: Array<{
      duration: string;
      id: string;
      slug: string;
      title: string;
      image: string;
      views: number;
      episodeTitle?: string;
      status?: string | null;
      releaseDate?: string;
      rating?: string | number | null;
      year?: string | null;
      genres?: string[];
    }>;
    currentPage: number;
    totalPages: number;
  };

  let error: string | null = null;
  let showWarning = true;
  let imageObserver: IntersectionObserver | null = null;
  let mounted = false;
  let imageLoadedStates: { [key: string]: boolean } = {};

  // Cookie helpers (optimized)
  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  };

  const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  };

  // Check for 18+ on mount (optimized - single check)
  const checkAge = () => {
    if (typeof window === 'undefined') return;
    const cookieCheck = getCookie('arms18plus') === 'yes';
    const storageCheck = typeof localStorage !== 'undefined' && localStorage.getItem('arms18plus') === 'yes';
    showWarning = !(cookieCheck || storageCheck);
  };

  checkAge();

  function closeWarning() {
    showWarning = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('arms18plus', 'yes');
    }
    if (typeof document !== 'undefined') {
      setCookie('arms18plus', 'yes', 365);
    }
  }

  function rejectWarning() {
    window.location.href = '/';
  }

  function handleImageLoad(id: string) {
    imageLoadedStates = { ...imageLoadedStates, [id]: true };
  }

  const pagesPerGroup = 3;
  
  // Memoized calculations
  $: startPage = Math.max(1, data.currentPage - Math.floor(pagesPerGroup / 2));
  $: endPage = Math.min(data.totalPages, startPage + pagesPerGroup - 1);
  $: pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  $: animeCount = data.animes?.length || 0;
  $: if (data.animes) {
    imageLoadedStates = {};
  }

  // Debounced page loading to prevent rapid clicks
  let pageLoadTimeout: ReturnType<typeof setTimeout> | null = null;

  async function loadPage(newPage: number) {
    if ($navigating || newPage === data.currentPage || newPage < 1 || newPage > data.totalPages) {
      return;
    }

    // Clear any pending navigation
    if (pageLoadTimeout) {
      clearTimeout(pageLoadTimeout);
    }

    error = null;

    // Scroll to top smoothly (non-blocking)
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    try {
      const currentPageStore = get(page);
      const newUrl = new URL(currentPageStore.url.href);
      if (newPage === 1) {
        newUrl.searchParams.delete('page');
      } else {
        newUrl.searchParams.set('page', newPage.toString());
      }

      await goto(newUrl.toString(), { replaceState: true, noScroll: true });
    } catch (e) {
      console.error('Error loading page:', e);
      error = e instanceof Error ? e.message : 'Failed to load page';
    }
  }

  // Optimized lazy loading with Intersection Observer
  onMount(() => {
    mounted = true;
    
    // Setup Intersection Observer for progressive image loading
    if ('IntersectionObserver' in window) {
      imageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;
              if (src && !img.src) {
                img.src = src;
                img.removeAttribute('data-src');
                imageObserver?.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.01
        }
      );

      // Observe all lazy images
      requestAnimationFrame(() => {
        document.querySelectorAll('img[data-src]').forEach((img) => {
          imageObserver?.observe(img);
        });
      });
    }
  });

  onDestroy(() => {
    mounted = false;
    if (imageObserver) {
      imageObserver.disconnect();
      imageObserver = null;
    }
    if (pageLoadTimeout) {
      clearTimeout(pageLoadTimeout);
    }
  });

  // Optimized image loading strategy
  function getImageProps(index: number) {
    // First 6 images load immediately for better LCP
    const shouldEagerLoad = index < 6;
    return {
      loading: shouldEagerLoad ? 'eager' : 'lazy',
      decoding: 'async',
      fetchpriority: shouldEagerLoad ? 'high' : 'auto'
    };
  }
</script>

<svelte:head>
  <title>{data.title || 'Monthly Releases'} | ARMS Hentai</title>
  <meta name="description" content="Latest monthly hentai releases. New episodes updated regularly.">
  <meta property="og:title" content={`${data.title || 'Monthly Releases'} | ARMS Hanime`}>
  <meta property="og:description" content="Latest monthly hentai releases. New episodes updated regularly.">
  <meta property="og:url" content="/hanime/monthly-release">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
</svelte:head>

<Navbar />

{#if showWarning}
  <AdultWarning onConfirm={closeWarning} onReject={rejectWarning} />
{/if}

<div class="flex flex-col min-h-screen bg-gradient-to-br from-[#2a0008] via-[#3a0d16] to-[#1a0106] text-white pt-16">
  {#if $navigating}
    <div class="flex items-center justify-center flex-1">
      <img
        src="/assets/loader.gif"
        alt="Loading..."
        class="object-contain loader-img"
        width="120"
        height="110"
      />
    </div>
  {:else}
    <div class="flex-1 w-full">
      <div class="max-w-[125rem] mx-auto flex flex-col gap-6 sm:gap-10 px-1 sm:px-2 lg:px-4">
        {#if error}
          <div class="bg-[#ff003c]/10 border-l-4 border-[#ff003c] text-[#ff003c] p-4 rounded-xl my-4">
            <p class="font-bold">ERROR: {error}</p>
            <button
              class="mt-2 px-4 py-1 bg-[#ff003c] text-white rounded hover:bg-[#c2002e] transition-colors"
              on:click={() => loadPage(data.currentPage || 1)}
            >
              Try Again
            </button>
          </div>
        {:else}
          <section class="mb-8">
            <div class="flex items-center gap-2 sm:gap-3 mb-2">
              <div class="w-1 h-7 sm:h-8 bg-[#ff003c] rounded-full flex-shrink-0"></div>
              <div class="flex-1">
                <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                  {data?.title || 'Monthly Releases'}
                </h1>
              </div>
            </div>
            <p class="text-[#ffb3c6] text-sm sm:text-base ml-4">
              Latest hentai episodes released this month
            </p>
            <p class="text-[#ffb3c6]/80 text-xs mt-1 ml-4">
              Page {data.currentPage} of {data.totalPages} • {animeCount} titles
            </p>
          </section>

          <section class="max-w-[1800px] mx-auto px-1">
            {#if data.animes && animeCount > 0}
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-2 lg:gap-2 anime-grid">
                {#each data.animes as anime, index (anime.id)}
                  <a
                    href={`/hanime/watch/${anime.slug || anime.id}`}
                    class="anime-card group relative bg-[#1a0106] rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40 cursor-pointer block"
                  >
                    <div class="relative aspect-[3/4]">
                      {#if !imageLoadedStates[anime.id]}
                        <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                      {/if}
                      <img
                        src={anime.image}
                        alt={anime.title}
                        class="w-full h-full object-cover {imageLoadedStates[anime.id] ? 'opacity-100' : 'opacity-0'}"
                        loading={getImageProps(index).loading as 'eager' | 'lazy'}
                        decoding={getImageProps(index).decoding as 'async' | 'sync' | 'auto'}
                        width="300"
                        height="400"
                        on:load={() => handleImageLoad(anime.id)}
                      />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent overlay"></div>
                      <div class="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
                        <span class="bg-[#ff003c] text-white px-2 py-0.5 rounded text-[10px] font-semibold shadow badge">
                          {#if anime.status}
                            {anime.status.toUpperCase()}
                          {/if}
                        </span>
                        <span class="bg-black/70 backdrop-blur-sm text-[#ffb3c6] px-2 py-0.5 rounded text-[10px] flex items-center gap-1 badge">
                          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                          {anime.rating || '0'}
                        </span>
                      </div>
                      <div class="absolute bottom-0 left-0 right-0 p-2 card-info">
                        <h3 class="font-semibold text-white text-xs mb-0.5 line-clamp-1 drop-shadow-lg group-hover:text-[#ffb3c6] transition-colors" title={anime.title}>
                          {anime.title}
                        </h3>
                        {#if anime.episodeTitle}
                          <p class="text-[#ffb3c6] text-[9px] mb-1 drop-shadow line-clamp-1">{anime.episodeTitle}</p>
                        {/if}
                        <div class="flex items-center justify-between gap-1">
                          <span class="bg-[#ff003c] text-white px-1.5 py-0.5 rounded text-[10px] font-bold badge">18+</span>
                          <span class="text-[#ffb3c6] text-[9px] drop-shadow ml-auto">{anime.releaseDate || '--'}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                {/each}
              </div>
            {:else}
              <div class="text-center py-12">
                <p class="text-[#ffb3c6] text-lg">No monthly releases found.</p>
              </div>
            {/if}
          </section>

          {#if data.totalPages > 1}
            <section class="flex justify-center items-center mt-6 gap-1 sm:gap-2 flex-wrap mb-8 pagination">
              {#if data.currentPage > 1}
                <button
                  class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-[#1a0106] text-white hover:bg-[#ff003c] hover:text-white transition disabled:opacity-50 pagination-btn"
                  on:click={() => loadPage(1)}
                  disabled={$navigating}
                  aria-label="First page"
                >
                  <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-none stroke-current" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
                  </svg>
                </button>
                <button
                  class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-[#1a0106] text-white hover:bg-[#ff003c] hover:text-white transition disabled:opacity-50 pagination-btn"
                  on:click={() => loadPage(data.currentPage - 1)}
                  disabled={$navigating}
                  aria-label="Previous page"
                >
                  <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-none stroke-current" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              {/if}

              {#each pageNumbers as pageNum}
                <button
                  class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-xs sm:text-sm transition disabled:opacity-50 pagination-btn
                    {data.currentPage === pageNum
                      ? 'bg-[#ff003c] text-white'
                      : 'bg-[#1a0106] text-white hover:bg-[#ff003c]/50'}"
                  on:click={() => loadPage(pageNum)}
                  disabled={$navigating}
                  aria-label={`Page ${pageNum}`}
                  aria-current={data.currentPage === pageNum ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              {/each}

              {#if data.currentPage < data.totalPages}
                <button
                  class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-[#1a0106] text-white hover:bg-[#ff003c] hover:text-white transition disabled:opacity-50 pagination-btn"
                  on:click={() => loadPage(data.currentPage + 1)}
                  disabled={$navigating}
                  aria-label="Next page"
                >
                  <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-none stroke-current" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                <button
                  class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-[#1a0106] text-white hover:bg-[#ff003c] hover:text-white transition disabled:opacity-50 pagination-btn"
                  on:click={() => loadPage(data.totalPages)}
                  disabled={$navigating}
                  aria-label="Last page"
                >
                  <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-none stroke-current" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                  </svg>
                </button>
              {/if}
            </section>
          {:else}
            <!-- Add spacing when pagination is hidden -->
            <div class="h-8 mb-8"></div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}

  <Footer />
</div>

<style>
  /* Skeleton Loader - plain background for performance */
  .skeleton-loader {
    background-color: #3a0d16;
  }
  
  /* Performance optimizations for mobile */
  
  /* Hardware acceleration for smooth animations */
  .anime-card {
    will-change: transform;
    transform: translateZ(0);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    -webkit-transform: translateZ(0);
  }

  /* Optimize hover for mobile (disable on touch devices) */
  @media (hover: none) and (pointer: coarse) {
    .anime-card:hover {
      transform: none;
    }
  }

  @media (hover: hover) and (pointer: fine) {
    .anime-card:hover {
      transform: scale(1.03);
    }
  }

  /* Active state for mobile touch feedback */
  .anime-card:active {
    transform: scale(0.98) translateZ(0);
  }

  /* Reduce paint areas */
  .overlay, .card-info, .badge {
    will-change: auto;
  }

  /* Optimize image rendering */
  img {
    transition: opacity 0.3s ease-in-out;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }

  .loader-img {
    max-width: 120px;
    max-height: 110px;
    aspect-ratio: 1 / 1;
  }

  /* Optimize grid performance */
  .anime-grid {
    contain: layout style paint;
  }

  /* Line clamp optimization */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Pagination button optimization */
  .pagination-btn {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
  }

  .pagination-btn:active {
    transform: scale(0.95) translateZ(0);
  }

  /* Reduce repaints on scroll */
  .pagination {
    contain: layout style;
  }

  /* Optimize text rendering on mobile */
  @media (max-width: 640px) {
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
  }

  /* GPU acceleration for transitions */
  .transition-transform,
  .transition-colors {
    transform: translateZ(0);
  }

  /* Remove will-change after animation */
  .anime-card:not(:hover) {
    will-change: auto;
  }

  /* Optimize backdrop-blur for mobile */
  @media (max-width: 768px) {
    .backdrop-blur-sm {
      backdrop-filter: none;
      background-color: rgba(0, 0, 0, 0.8);
    }
  }

  /* Contain layout for better performance */
  section {
    contain: layout style;
  }

  /* Optimize SVG rendering */
  svg {
    shape-rendering: geometricPrecision;
  }

  /* Reduce animation on mobile for better battery life */
  @media (prefers-reduced-motion: reduce) {
    .skeleton-loader {
      animation: none;
      background: #3a0d16;
    }

    img {
      transition: none;
    }

    .anime-card {
      transition: none;
    }
  }
</style>