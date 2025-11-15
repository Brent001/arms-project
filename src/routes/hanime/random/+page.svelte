<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Navbar from '$lib/components/hanime/Navbar.svelte';
  import Footer from '$lib/components/hanime/Footer.svelte';
  import AdultWarning from '$lib/components/hanime/AdultWarning.svelte';

  let randomAnimes: any[] = [];
  let loading = true;
  let error: string | null = null;
  let showWarning = true;
  let mounted = false;
  let fetchController: AbortController | null = null;
  let imageObserver: IntersectionObserver | null = null;

  // Helper to get cookie value (optimized)
  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  };

  // Helper to set cookie (optimized)
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

  // Optimized fetch with abort controller
  async function fetchRandomAnimes() {
    // Cancel any pending request
    if (fetchController) {
      fetchController.abort();
    }

    fetchController = new AbortController();
    loading = true;
    error = null;

    try {
      const response = await fetch('/api/hanime/random', {
        signal: fetchController.signal
      });

      if (!response.ok) {
        throw new Error('Failed to fetch random animes');
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        randomAnimes = data.data.results;
      } else {
        throw new Error('Failed to fetch random animes');
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        error = 'Failed to load content. Please try again later.';
        console.error(e);
      }
    } finally {
      loading = false;
      fetchController = null;
    }
  }

  // Memoized calculations
  $: animeCount = randomAnimes?.length || 0;

  // Optimized refresh handler with debounce
  let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

  function handleRefresh() {
    if (loading) return;

    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }

    // Smooth scroll to top
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    refreshTimeout = setTimeout(() => {
      fetchRandomAnimes();
      refreshTimeout = null;
    }, 300);
  }

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

  onMount(() => {
    mounted = true;
    checkAge();
    fetchRandomAnimes();

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
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = null;
    }
  });
</script>

<svelte:head>
  <title>Random Hanime | ARMS Hentai</title>
  <meta name="description" content="Discover random adult anime content. New suggestions with every refresh." />
  <meta property="og:title" content="Random Hanime | ARMS Hanime">
  <meta property="og:description" content="Discover random adult anime content. New suggestions with every refresh.">
  <meta property="og:url" content="/hanime/random">
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
              class="mt-2 px-4 py-1 bg-[#ff003c] text-white rounded hover:bg-[#c2002e] transition-colors refresh-btn"
              on:click={handleRefresh}
            >
              Try Again
            </button>
          </div>
        {:else}
          <section class="mb-4 sm:mb-8 header-section">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 class="text-3xl sm:text-4xl font-bold text-[#ff003c] mb-4">
                  Random Hanime
                </h1>
                <p class="text-[#ffb3c6] text-sm sm:text-base">
                  Discover random adult anime content. New suggestions with every refresh.
                </p>
                <p class="text-[#ffb3c6]/80 text-xs mt-2">
                  {animeCount} titles loaded
                </p>
              </div>
              <button
                on:click={handleRefresh}
                class="px-4 py-2 bg-[#ff003c] text-white rounded-lg hover:bg-[#c2002e] transition-colors flex items-center justify-center gap-2 font-bold text-sm mx-auto sm:mx-0 refresh-btn"
                disabled={loading}
                aria-label="Refresh random animes"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </section>

          <section class="max-w-[1800px] mx-auto px-1">
            {#if randomAnimes && animeCount > 0}
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-2 lg:gap-2 anime-grid">
                {#each randomAnimes as anime, index (anime.id)}
                  <a
                    href={`/hanime/info/${anime.id}`}
                    class="anime-card group relative bg-[#1a0106] rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40 cursor-pointer block"
                  >
                    <div class="relative aspect-[3/4]">
                      <img
                        src={anime.image}
                        alt={anime.title}
                        class="w-full h-full object-cover"
                        loading={getImageProps(index).loading as 'eager' | 'lazy'}
                        decoding={getImageProps(index).decoding as 'async' | 'sync' | 'auto'}
                        width="300"
                        height="400"
                      />
                      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent overlay"></div>
                      <div class="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
                        <span class="bg-[#ff003c] text-white px-2 py-0.5 rounded text-[10px] font-semibold shadow badge">
                          Random
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
                <p class="text-[#ffb3c6] text-lg">No hanime found. Try refreshing.</p>
              </div>
            {/if}
          </section>
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

  /* Line clamp optimization */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    line-clamp: 2; /* Added for compatibility */
  }

  /* Refresh button optimization */
  .refresh-btn {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    transform: translateZ(0);
  }

  .refresh-btn:active {
    transform: scale(0.95) translateZ(0);
  }

  /* Header section optimization */
  .header-section {
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

  /* Optimize refresh button hover */
  @media (hover: hover) and (pointer: fine) {
    .refresh-btn:hover {
      transform: translateZ(0);
    }
  }

  /* Active state for mobile touch feedback */
  .anime-card:active {
    transform: scale(0.98) translateZ(0);
  }

  /* Optimize SVG rendering */
  svg {
    shape-rendering: geometricPrecision;
  }
</style>