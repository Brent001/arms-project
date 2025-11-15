<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { writable } from 'svelte/store';
  import Navbar from '$lib/components/Navbar.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import AnimeSchedule from '$lib/components/AnimeSchedule.svelte';
  import Carousel from '$lib/components/Carousel.svelte';
  import AnimeCard from '$lib/components/AnimeCard.svelte';
  import HomeAnimeColumns from '$lib/components/HomeAnimeColumns.svelte';
  import Genre from '$lib/components/genre.svelte';

  // Performance optimizations
  let loading = true;
  let error: string | null = null;
  let data: any = null;
  let trendingAnimeDetails: Record<string, any> = {};

  // Carousel state
  let carouselIndex = 0;
  let carouselInterval: number | null = null;

  // Tab states
  let activeTab: 'popular' | 'topRated' | 'topAiring' | 'completed' = 'popular';
  let sidebarTab: 'today' | 'week' | 'month' = 'today';
  let showAllGenres = false;

  // Performance: Batch anime details fetching with concurrency limit
  const CONCURRENT_REQUESTS = 5;
  const detailsCache = new Map<string, any>();

  async function fetchAnimeDetailsBatch(animeIds: string[]) {
    const uncachedIds = animeIds.filter(id => !detailsCache.has(id));
    if (uncachedIds.length === 0) return;
  }

  // Performance: Debounced reactive statement
  let updateTimeout: number;
  $: {
    window.clearTimeout(updateTimeout);
    updateTimeout = window.setTimeout(() => {
      visibleGenres = data?.genres ? (showAllGenres ? data.genres : data.genres.slice(0, 12)) : [];
    }, 50);
  }
  
  let visibleGenres: any[] = [];

  // Performance: Optimize carousel interval
  function startCarousel() {
    if (carouselInterval) window.clearInterval(carouselInterval);
    
    carouselInterval = window.setInterval(() => {
      if (data?.spotlightAnimes?.length > 0) {
        carouselIndex = (carouselIndex + 1) % data.spotlightAnimes.length;
      }
    }, 10000);
  }

  function stopCarousel() {
    if (carouselInterval) {
      window.clearInterval(carouselInterval);
      carouselInterval = null;
    }
  }

  // Performance: Use AbortController for request cancellation
  let abortController: AbortController | null = null;

  onMount(() => {
    abortController = new AbortController();
    
    (async () => {
      try {
        const resp = await fetch('/api/home', {
          signal: abortController?.signal
        });
        
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        
        if (json.success) {
          data = json.data;

          // Performance: Lazy load trending anime details
          const trendingAnime = data.trendingAnimes || [];
          if (trendingAnime.length > 0) {
            // Load details for visible items first (first 10)
            const visibleIds = trendingAnime.slice(0, 10).map((anime: any) => anime.id);
            await fetchAnimeDetailsBatch(visibleIds);
            
            // Load remaining details in background if needed
            if (trendingAnime.length > 10) {
              const remainingIds = trendingAnime.slice(10).map((anime: any) => anime.id);
              // Non-blocking background fetch
              fetchAnimeDetailsBatch(remainingIds);
            }
          }

          // Start carousel after data is loaded
          startCarousel();
        } else {
          error = json.error || 'Failed to load data';
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          error = e.message || 'Failed to load data';
        }
      } finally {
        loading = false;
      }
    })();
  });

  onDestroy(() => {
    // Cleanup
    if (abortController) {
      abortController.abort();
    }
    stopCarousel();
    window.clearTimeout(updateTimeout);
    detailsCache.clear();
  });

  function setTab(tab: typeof activeTab) {
    activeTab = tab;
  }

  // Performance: Memoize route mapping
  const routes = {
    popular: '/most-popular', 
    topRated: '/top-rated',
    latest: '/latest-episodes'
  } as const;

  function handleViewMore() {
    // Implementation here
  }

  // Tab mapping
  const tabMap = {
    popular: 'mostPopularAnimes',
    topRated: 'mostFavoriteAnimes',
    topAiring: 'topAiringAnimes',
    completed: 'latestCompletedAnimes'
  } as const;

  // Performance: Memoize sliced arrays to prevent unnecessary re-renders
  $: trendingAnimeSlice = data?.trendingAnimes?.slice(0, 10) || [];
  $: latestEpisodeSlice = data?.latestEpisodeAnimes?.slice(0, 12) || [];
  $: latestAddedSlice = data?.latestAddedAnimes?.slice(0, 12) || [];
  $: spotlightAnimes = data?.spotlightAnimes || [];

  // Performance: Visibility observer for lazy loading (if supported)
  let intersectionObserver: IntersectionObserver | undefined;
  
  function setupLazyLoading() {
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Lazy load content when it comes into view
            const section = entry.target.getAttribute('data-section');
            if (section === 'trending' && trendingAnimeSlice.length > 0) {
              // Load any missing details
              const missingIds = trendingAnimeSlice
                .filter((anime: any) => !detailsCache.has(anime.id))
                .map((anime: any) => anime.id);
              if (missingIds.length > 0) {
                fetchAnimeDetailsBatch(missingIds);
              }
            }
          }
        });
      }, { threshold: 0.1 });
    }
  }
</script>

<svelte:head>
  <title>Home | ARMS Anime Streaming</title>
  <!-- Performance: Add preload hints for critical resources -->
  <link rel="preload" href="/assets/loader.gif" as="image">
</svelte:head>

<Navbar />

<div class="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pt-16">
  {#if loading}
    <!-- Performance: Optimized loading screen -->
    <div class="flex items-center justify-center flex-1">
      <img
        src="/assets/loader.gif"
        alt="Loading..."
        class="object-contain w-30 h-28"
        loading="eager"
        decoding="async"
      />
    </div>
  {:else}
    <!-- Main content -->
    <div class="flex-1 w-full">
      <div class="max-w-[125rem] mx-auto flex flex-col px-2 sm:px-6">
        {#if error}
          <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-xl my-4">
            <p class="font-bold">ERROR: {error}</p>
          </div>
        {:else}
          <!-- Performance: Only render carousel if data exists -->
          {#if spotlightAnimes.length > 0}
            <section class="mb-0">
              <Carousel
                animes={spotlightAnimes}
                intervalMs={10000}
                onWatch={(id) => goto(`/watch/${id}`)}
              />
            </section>
          {/if}

          <!-- Mobile Order: Trending First, then Home Columns -->
          <div class="block md:hidden">
            <!-- Trending Anime Section - Mobile First -->
            {#if trendingAnimeSlice.length > 0}
              <section class="max-w-[1800px] mx-auto px-2 mt-6" data-section="trending">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
                  <h2 class="text-xl sm:text-2xl font-bold text-orange-400 flex items-center gap-3">
                    <svg class="w-6 h-6 sm:w-7 sm:h-7 text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    Trending Anime
                  </h2>
                </div>
                <div class="trending-anime-grid">
                  {#each trendingAnimeSlice as anime (anime.id)}
                    <AnimeCard 
                      {anime}
                      showRank={true}
                      showDescription={true}
                      description={trendingAnimeDetails[anime.id]?.description ?? ''}
                      genres={trendingAnimeDetails[anime.id]?.genres ?? []}
                      duration={trendingAnimeDetails[anime.id]?.stats?.duration ?? ''}
                      type={trendingAnimeDetails[anime.id]?.stats?.type ?? ''}
                    />
                  {/each}
                </div>
              </section>
            {/if}

            <!-- Home Anime Columns - Mobile Second -->
            {#if data}
              <div class="mt-6">
                <HomeAnimeColumns {data} />
              </div>
            {/if}
          </div>

          <!-- Desktop Order: Home Columns First, then Trending -->
          <div class="hidden md:block">
            <!-- Home Anime Columns - Desktop First -->
            {#if data}
              <div class="mt-0">
                <HomeAnimeColumns {data} />
              </div>
            {/if}
          </div>

          <!-- Main content and sidebar layout -->
          <div class="flex flex-col xl:flex-row gap-2 w-full mt-6 sm:mt-10">
            <!-- Main content -->
            <div class="flex-1 flex flex-col gap-6 sm:gap-10">

              <!-- Trending Anime Section - Desktop Only -->
              <div class="hidden md:block">
                {#if trendingAnimeSlice.length > 0}
                  <section class="max-w-[1800px] mx-auto px-2" data-section="trending">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
                      <h2 class="text-xl sm:text-2xl font-bold text-orange-400 flex items-center gap-3">
                        <svg class="w-6 h-6 sm:w-7 sm:h-7 text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        Trending Anime
                      </h2>
                    </div>
                    <div class="trending-anime-grid">
                      {#each trendingAnimeSlice as anime (anime.id)}
                        <AnimeCard 
                          {anime}
                          showRank={true}
                          showDescription={true}
                          description={trendingAnimeDetails[anime.id]?.description ?? ''}
                          genres={trendingAnimeDetails[anime.id]?.genres ?? []}
                          duration={trendingAnimeDetails[anime.id]?.stats?.duration ?? ''}
                          type={trendingAnimeDetails[anime.id]?.stats?.type ?? ''}
                        />
                      {/each}
                    </div>
                  </section>
                {/if}
              </div>

              <!-- Latest Episodes Section -->
              {#if latestEpisodeSlice.length > 0}
                <section class="max-w-[1800px] mx-auto px-2 mt-2">
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-2 gap-2">
                    <div class="flex items-center justify-between w-full">
                      <h2 class="text-xl sm:text-2xl font-bold text-orange-400 flex items-center gap-3">
                        <svg class="w-6 h-6 sm:w-7 sm:h-7 text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        Latest Episodes
                      </h2>
                      <a
                        href="/recently-updated"
                        class="text-orange-300 hover:text-orange-400 font-semibold text-sm transition block ml-2 whitespace-nowrap"
                      >
                        View more &gt;
                      </a>
                    </div>
                  </div>
                  <div class="responsive-anime-grid">
                    {#each latestEpisodeSlice as ep (ep.id)}
                      <AnimeCard 
                        anime={ep}
                        showEpisodes={true}
                        showDescription={true}
                        description={ep.description ?? ''}
                        genres={ep.genres ?? []}
                        duration={ep.duration ?? ''}
                        type={ep.type ?? ''}
                      />
                    {/each}
                  </div>
                </section>
              {/if}

              <!-- New Anime Section -->
              {#if latestAddedSlice.length > 0}
                <section class="max-w-[1800px] mx-auto px-2 mt-2">
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-2 gap-2">
                    <div class="flex items-center justify-between w-full">
                      <h2 class="text-xl sm:text-2xl font-bold text-orange-400 flex items-center gap-3">
                        <svg class="w-6 h-6 sm:w-7 sm:h-7 text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        New Anime
                      </h2>
                      <a
                        href="/recently-added"
                        class="text-orange-300 hover:text-orange-400 font-semibold text-sm transition block ml-2 whitespace-nowrap"
                      >
                        View more &gt;
                      </a>
                    </div>
                  </div>
                  <div class="responsive-anime-grid">
                    {#each latestAddedSlice as anime (anime.id)}
                      <AnimeCard 
                        anime={anime}
                        showEpisodes={true}
                        showDescription={true}
                        description={anime.description ?? ''}
                        genres={anime.genres ?? []}
                        duration={anime.duration ?? ''}
                        type={anime.type ?? ''}
                      />
                    {/each}
                  </div>
                </section>
              {/if}
            </div>
            
            <!-- Sidebar as a component -->
            <div class="hidden xl:flex flex-col gap-2">
              {#if data}
                <Sidebar
                  sidebarTab={sidebarTab}
                  setSidebarTab={(tab) => sidebarTab = tab}
                  top10Today={data.top10Animes?.today ?? []}
                  top10Week={data.top10Animes?.week ?? []}
                  top10Month={data.top10Animes?.month ?? []}
                />
                <Genre data={data.genres ?? []} />
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Add AnimeSchedule Component at the Bottom -->
    <section class="wrapper-container my-8 px-4">
      <div class="schedule-wrapper bg-gray-800 rounded-lg shadow-lg p-4">
        <AnimeSchedule />
      </div>
    </section>
  {/if}

  <!-- Footer always visible -->
  <Footer />
</div>

<style>
  /* Responsive Grid System for Anime Cards */
  .responsive-anime-grid {
    display: grid;
    gap: 0.5rem;
    
    /* Mobile: 2 columns */
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  /* Small tablets and larger phones (640px+) */
  @media (min-width: 640px) {
    .responsive-anime-grid {
      gap: 0.5rem;
    }
  }

  /* Tablets (768px+) */
  @media (min-width: 768px) {
    .responsive-anime-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
    }
  }

  /* Large tablets (1024px+) */
  @media (min-width: 1024px) {
    .responsive-anime-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  /* HD screens (1280px+) */
  @media (min-width: 1280px) {
    .responsive-anime-grid {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }

  /* Full HD screens (1378px+) */
  @media (min-width: 1378px) {
    .responsive-anime-grid {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }

  /* Large Full HD screens (1536px+) */
  @media (min-width: 1536px) {
    .responsive-anime-grid {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }

  /* 2K screens and above (1800px+) */
  @media (min-width: 1800px) {
    .responsive-anime-grid {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }

  /* Trending Anime Grid - Maximum 5 columns */
  .trending-anime-grid {
    display: grid;
    gap: 0.5rem;
    
    /* Mobile: 2 columns */
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  /* Small tablets and larger phones (640px+) */
  @media (min-width: 640px) {
    .trending-anime-grid {
      gap: 0.5rem;
    }
  }

  /* Tablets (768px+) */
  @media (min-width: 768px) {
    .trending-anime-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
    }
  }

  /* Large tablets (1024px+) */
  @media (min-width: 1024px) {
    .trending-anime-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  /* HD screens and above (1280px+) */
  @media (min-width: 1280px) {
    .trending-anime-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
  }
</style>