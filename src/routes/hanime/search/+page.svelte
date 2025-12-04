<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Navbar from '$lib/components/hanime/Navbar.svelte';
  import Footer from '$lib/components/hanime/Footer.svelte';
  import AdultWarning from '$lib/components/hanime/AdultWarning.svelte';

  let loading = true;
  let error: string | null = null;
  let hanimeResults: any[] = [];
  let query = '';
  let page = 1;
  let totalPages = 1;
  let showWarning = true;
  let imageLoadedStates: { [key: string]: boolean } = {};
  let mounted = false;
  let fetchController: AbortController | null = null;
  let imageObserver: IntersectionObserver | null = null;

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

  // Check age verification (optimized - single check)
  const checkAge = () => {
    if (typeof window === 'undefined') return;
    const cookieCheck = getCookie('arms18plus') === 'yes';
    const storageCheck = typeof localStorage !== 'undefined' && localStorage.getItem('arms18plus') === 'yes';
    showWarning = !(cookieCheck || storageCheck);
  };

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

  // Optimized fetch with abort controller
  async function fetchSearchResults() {
    // Cancel any pending request
    if (fetchController) {
      fetchController.abort();
    }

    fetchController = new AbortController();
    loading = true;
    error = null;
    imageLoadedStates = {}; // Reset image loaded states

    try {
      const resp = await fetch(
        `/api/hanime/search?query=${encodeURIComponent(query)}&page=${page}`,
        { signal: fetchController.signal }
      );

      if (!resp.ok) {
        throw new Error('Failed to fetch search results');
      }

      const json = await resp.json();

      if (json.status === 'success') {
        hanimeResults = json.data.results || [];
        totalPages = json.data.totalPages || 1;
      } else {
        hanimeResults = [];
        error = json.error || 'Failed to fetch search results';
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        error = 'Failed to fetch search results';
      }
    } finally {
      loading = false;
      fetchController = null;
    }
  }

  // Debounced page navigation
  let pageTimeout: ReturnType<typeof setTimeout> | null = null;

  async function goToPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      if (pageTimeout) {
        clearTimeout(pageTimeout);
      }

      page = newPage;

      // Smooth scroll to top
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }

      pageTimeout = setTimeout(async () => {
        await fetchSearchResults();
        window.history.pushState({}, '', `/hanime/search?query=${encodeURIComponent(query)}&page=${page}`);
        pageTimeout = null;
      }, 200);
    }
  }

  // Optimized image load handler
  function handleImageLoad(id: string) {
    imageLoadedStates = { ...imageLoadedStates, [id]: true };
  }

  // Memoized calculations
  $: resultsCount = hanimeResults?.length || 0;
  $: hasResults = resultsCount > 0;
  $: showPrevButton = page > 1;
  $: showNextButton = page < totalPages;

  // Optimized image loading strategy
  function getImageProps(index: number): {
    loading: 'eager' | 'lazy';
    decoding: 'async' | 'sync' | 'auto';
    fetchpriority: 'high' | 'auto';
  } {
    // First 6 images load immediately for better LCP
    const shouldEagerLoad = index < 6;
    return {
      loading: shouldEagerLoad ? 'eager' : 'lazy',
      decoding: 'async',
      fetchpriority: shouldEagerLoad ? 'high' : 'auto'
    };
  }

  onMount(async () => {
    mounted = true;
    checkAge();

    // Get URL params
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      query = urlParams.get('query') || '';
      page = parseInt(urlParams.get('page') || '1', 10);

      if (query) {
        await fetchSearchResults();
      } else {
        loading = false;
      }
    }

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

    // Cleanup abort controller
    if (fetchController) {
      fetchController.abort();
      fetchController = null;
    }

    // Cleanup observer
    if (imageObserver) {
      imageObserver.disconnect();
      imageObserver = null;
    }

    // Cleanup timeout
    if (pageTimeout) {
      clearTimeout(pageTimeout);
      pageTimeout = null;
    }
  });
</script>

<svelte:head>
  <title>Hanime Search - {query}</title>
  <meta name="description" content={`Search results for "${query}" on ARMS Hentai`}>
  <meta property="og:title" content={`Hanime Search - ${query}`}>
  <meta property="og:description" content={`Search results for "${query}" on ARMS Hanime`}>
  <meta property="og:url" content={`/hanime/search?query=${encodeURIComponent(query)}&page=${page}`}>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
</svelte:head>

<Navbar />

{#if showWarning}
  <AdultWarning onConfirm={closeWarning} onReject={rejectWarning} />
{/if}

<div class="flex flex-col min-h-screen bg-gradient-to-br from-[#2a0008] via-[#3a0d16] to-[#1a0106] text-white pt-16">
  {#if loading}
    <div class="flex items-center justify-center flex-1">
      <img
        src="/assets/loader.gif"
        alt="Loading..."
        class="object-contain loader-img"
        width="120"
        height="110"
      />
    </div>
  {:else if error}
    <div class="flex-1">
      <div class="max-w-[125rem] mx-auto px-1 sm:px-2 lg:px-4">
        <div class="bg-[#ff003c]/10 border-l-4 border-[#ff003c] text-[#ff003c] p-4 rounded-xl my-4 backdrop-blur-sm error-container">
          <div class="flex items-center gap-3">
            <svg class="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <div>
              <h3 class="font-semibold text-lg">Error</h3>
              <p class="text-[#ffb3c6] mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex-1">
      <div class="max-w-[125rem] mx-auto flex flex-col gap-6 sm:gap-10 px-1 sm:px-2 lg:px-4">
        <section class="max-w-7xl mx-auto w-full">
          <h1 class="text-xl sm:text-2xl font-bold text-[#ff003c] mb-4 sm:mb-6 flex items-center gap-3">
            <svg class="w-6 h-6 sm:w-7 sm:h-7 text-[#ff003c]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Hanime Results for "{query}"
          </h1>
          
          {#if !hasResults}
            <div class="text-[#ffb3c6] text-center py-12">
              <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-lg">No results found for "{query}"</p>
              <p class="text-sm mt-2 opacity-75">Try a different search term</p>
            </div>
          {:else}
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-2 lg:gap-2 anime-grid">
              {#each hanimeResults as hanime, index (hanime.id)}
                <a
                  href={`/hanime/info/${hanime.id}`}
                  class="anime-card group relative bg-[#1a0106] rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40 cursor-pointer block"
                >
                  <div class="relative aspect-[3/4]">
                    <!-- Skeleton loader -->
                    {#if !imageLoadedStates[`hanime-${hanime.id}`]}
                      <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                    {/if}
                    <img
                      src={hanime.image}
                      alt={hanime.title}
                      class="w-full h-full object-cover image-fade {imageLoadedStates[`hanime-${hanime.id}`] ? 'opacity-100' : 'opacity-0'}"
                      loading={getImageProps(index).loading}
                      decoding={getImageProps(index).decoding}
                      width="300"
                      height="400"
                      on:load={() => handleImageLoad(`hanime-${hanime.id}`)}
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent overlay"></div>
                    <div class="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
                      <span class="bg-[#ff003c] text-white px-2 py-0.5 rounded text-[10px] font-semibold shadow badge">
                        Hanime
                      </span>
                      <span class="bg-black/70 backdrop-blur-sm text-[#ffb3c6] px-2 py-0.5 rounded text-[10px] flex items-center gap-1 badge">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 18.657l-6.828-6.829a4 4 0 010-5.656z"/>
                        </svg>
                        {hanime.views?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div class="absolute bottom-0 left-0 right-0 p-2 card-info">
                      <h3 class="font-semibold text-white text-xs mb-1 line-clamp-2 group-hover:text-[#ffb3c6] transition-colors" title={hanime.title}>
                        {hanime.title}
                      </h3>
                      <div class="flex items-center justify-between">
                        <span class="bg-[#ff003c] text-white px-1.5 py-0.5 rounded text-[10px] font-bold badge">18+</span>
                        <span class="text-[#ffb3c6] text-[10px]">{hanime.duration || '--:--'}</span>
                      </div>
                    </div>
                  </div>
                </a>
              {/each}
            </div>
          {/if}
          
          <!-- Pagination -->
          {#if totalPages > 1}
            <div class="flex justify-center items-center gap-4 mt-8 pagination">
              {#if showPrevButton}
                <button 
                  class="px-4 py-2 bg-[#1a0106] text-[#ff003c] rounded-lg hover:bg-[#ff003c] hover:text-black transition-colors pagination-btn" 
                  on:click={() => goToPage(page - 1)}
                  aria-label="Previous page"
                >
                  Previous
                </button>
              {/if}
              <span class="px-4 py-2 text-gray-400">Page {page} of {totalPages}</span>
              {#if showNextButton}
                <button 
                  class="px-4 py-2 bg-[#1a0106] text-[#ff003c] rounded-lg hover:bg-[#ff003c] hover:text-black transition-colors pagination-btn" 
                  on:click={() => goToPage(page + 1)}
                  aria-label="Next page"
                >
                  Next
                </button>
              {/if}
            </div>
          {/if}
          
          <!-- Add spacing before footer -->
          <div class="h-8"></div>
        </section>
      </div>
    </div>
  {/if}
  <Footer />
</div>

<style>
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

  /* Skeleton Loader - plain background for performance */
  .skeleton-loader {
    background-color: #3a0d16;
  }

  /* Image fade transition - optimized */
  .image-fade {
    transition: opacity 0.3s ease-in-out;
    will-change: opacity;
  }

  /* Pagination button optimization */
  .pagination-btn {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    transform: translateZ(0);
  }

  .pagination-btn:active {
    transform: scale(0.95) translateZ(0);
  }

  /* Error container optimization */
  .error-container {
    contain: layout style;
  }

  /* Pagination container optimization */
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

  .image-fade.opacity-100 {
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

    .image-fade {
      transition: none;
    }

    .anime-card {
      transition: none;
    }
  }
</style>