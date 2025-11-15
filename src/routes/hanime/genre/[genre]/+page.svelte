<script lang="ts">
  import Navbar from '$lib/components/hanime/Navbar.svelte';
  import Footer from '$lib/components/hanime/Footer.svelte';
  import AdultWarning from '$lib/components/hanime/AdultWarning.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { onMount, onDestroy } from 'svelte';

  export let data: {
    genre: string;
    animes: Array<{
      duration: string;
      id: string;
      title: string;
      image: string;
      views: number;
    }>;
    currentPage: number;
    totalPages: number;
  };

  let loading = false;
  let error: string | null = null;
  let showWarning = true;
  let imageObserver: IntersectionObserver | null = null;
  let mounted = false;

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

  const pagesPerGroup = 3;
  
  // Memoized calculations
  $: startPage = Math.max(1, data.currentPage - Math.floor(pagesPerGroup / 2));
  $: endPage = Math.min(data.totalPages, startPage + pagesPerGroup - 1);
  $: pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  $: animeCount = data.animes?.length || 0;

  // Debounced page loading to prevent rapid clicks
  let pageLoadTimeout: ReturnType<typeof setTimeout> | null = null;
  
  async function loadPage(newPage: number) {
    if (newPage === data.currentPage || newPage < 1 || newPage > data.totalPages || loading) {
      return;
    }

    // Clear any pending navigation
    if (pageLoadTimeout) {
      clearTimeout(pageLoadTimeout);
    }

    loading = true;
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
    } finally {
      loading = false;
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
  function getImageProps(index: number): {
    loading: 'eager' | 'lazy';
    decoding: 'async' | 'sync' | 'auto';
    fetchpriority: 'high' | 'auto';
  } {
    // First 6 images load immediately for better LCP
    const shouldEagerLoad = index < 6;
    return {
      loading: shouldEagerLoad ? 'eager' : 'lazy',
      decoding: 'async', // Or 'sync' or 'auto' based on need
      fetchpriority: shouldEagerLoad ? 'high' : 'auto'
    };
  }
</script>

<svelte:head>
  <title>{data.genre || 'Genre'} | ARMS Hentai</title>
  <meta name="description" content={`Explore the best hanime in the ${data.genre} genre.`}>
  <meta property="og:title" content={`${data.genre || 'Genre'} | ARMS Hanime`}>
  <meta property="og:description" content={`Explore the best hanime in the ${data.genre} genre.`}>  
  <meta property="og:url" content={data ? `/hanime/genre/${data.genre}` : ''}>
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
  {:else}
    <div class="flex-1 w-full">
      <div class="max-w-[125rem] mx-auto flex flex-col gap-6 sm:gap-10 px-1 sm:px-4">
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
          <section class="mb-4 sm:mb-8">
            <h1 class="text-3xl sm:text-4xl font-bold text-[#ff003c] mb-4 capitalize">
              {data?.genre || 'Genre'}
            </h1>
            <p class="text-[#ffb3c6] text-sm sm:text-base">
              Explore the best hanime in the <span class="font-bold text-[#ff003c] capitalize">{data.genre}</span> genre.
            </p>
            <p class="text-[#ffb3c6]/80 text-xs mt-2">
              Page {data.currentPage} of {data.totalPages} • {animeCount} titles
            </p>
          </section>

          <section class="max-w-[1800px] mx-auto px-1">
            {#if data.animes && animeCount > 0}
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-2 lg:gap-2 anime-grid">
                {#each data.animes as anime, index (anime.id)}
                  <a
                    href={`/hanime/info/${anime.id}`}
                    class="anime-card group relative bg-[#1a0106] rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40 cursor-pointer block"
                  >
                    <div class="relative aspect-[3/4]">
                      <img
                        src={anime.image}
                        alt={anime.title}
                        class="w-full h-full object-cover"
                        loading={getImageProps(index).loading}
                        decoding={getImageProps(index).decoding}
                        width="300"
                        height="400"
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
                          {anime.views?.toLocaleString() || '0'}
                        </span>
                      </div>
                      <div class="absolute bottom-0 left-0 right-0 p-2 card-info">
                        <h3 class="font-semibold text-white text-xs mb-1 line-clamp-2 group-hover:text-[#ffb3c6] transition-colors" title={anime.title}>
                          {anime.title}
                        </h3>
                        <div class="flex items-center justify-between">
                          <span class="bg-[#ff003c] text-white px-1.5 py-0.5 rounded text-[10px] font-bold badge">18+</span>
                          <span class="text-[#ffb3c6] text-[10px]">{anime.duration || '--:--'}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                {/each}
              </div>
            {:else}
              <div class="text-center py-12">
                <p class="text-[#ffb3c6] text-lg">No hanime found in this genre.</p>
              </div>
            {/if}
          </section>

          {#if data.totalPages > 1}
            <section class="flex justify-center items-center mt-6 gap-2 flex-wrap mb-8 pagination">
              {#if data.currentPage > 1}
                <button
                  class="px-3 py-2 rounded-lg font-bold text-sm bg-[#2a0008] text-white hover:bg-[#ff003c] hover:text-black transition-colors disabled:opacity-50 pagination-btn"
                  on:click={() => loadPage(1)}
                  disabled={loading}
                  aria-label="First page"
                >
                  ««
                </button>
                <button
                  class="px-3 py-2 rounded-lg font-bold text-sm bg-[#2a0008] text-white hover:bg-[#ff003c] hover:text-black transition-colors disabled:opacity-50 pagination-btn"
                  on:click={() => loadPage(data.currentPage - 1)}
                  disabled={loading}
                  aria-label="Previous page"
                >
                  «
                </button>
              {/if}

              {#each pageNumbers as pageNum}
                <button
                  class="px-3 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 pagination-btn
                    {data.currentPage === pageNum
                      ? 'bg-[#ff003c] text-black'
                      : 'bg-[#2a0008] text-white hover:bg-[#ff003c] hover:text-black'}"
                  on:click={() => loadPage(pageNum)}
                  disabled={loading}
                  aria-label={`Page ${pageNum}`}
                  aria-current={data.currentPage === pageNum ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              {/each}

              {#if data.currentPage < data.totalPages}
                <button
                  class="px-3 py-2 rounded-lg font-bold text-sm bg-[#2a0008] text-white hover:bg-[#ff003c] hover:text-black transition-colors disabled:opacity-50 pagination-btn"
                  on:click={() => loadPage(data.currentPage + 1)}
                  disabled={loading}
                  aria-label="Next page"
                >
                  »
                </button>
                <button
                  class="px-3 py-2 rounded-lg font-bold text-sm bg-[#2a0008] text-white hover:bg-[#ff003c] hover:text-black transition-colors disabled:opacity-50 pagination-btn"
                  on:click={() => loadPage(data.totalPages)}
                  disabled={loading}
                  aria-label="Last page"
                >
                  »»
                </button>
              {/if}
            </section>
          {/if}
        {/if}
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

  /* Pagination button optimization */
  .pagination-btn {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
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
    will-change: transform;
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
</style>