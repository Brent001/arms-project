<script lang="ts">
  import { onMount } from 'svelte';
  import Navbar from '$lib/components/Navbar.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let loading = true;
  let error: string | null = null;
  let animeResults: any[] = [];
  let mangaResults: any[] = [];
  let query = '';
  let page = 1;
  let totalPagesAnime = 1;
  let totalPagesManga = 1;
  let topAiringAnimes: any[] = [];
  let topUpcomingAnimes: any[] = [];
  let top10Animes: { today?: any[]; week?: any[]; month?: any[] } = {};
  let sidebarTab: 'today' | 'week' | 'month' = 'today';
  let imageLoadedStates: { [key: string]: boolean } = {};

  $: totalPages = Math.max(totalPagesAnime, totalPagesManga);
  const pagesPerGroup = 3;
  $: startPage = Math.max(1, page - Math.floor(pagesPerGroup / 2));
  $: endPage = Math.min(totalPages, startPage + pagesPerGroup - 1);

  $: pageNumbers = Array.from(
    { length: endPage - startPage + 1 }, 
    (_, i) => startPage + i
  );

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    query = urlParams.get('q') || '';
    page = parseInt(urlParams.get('page') || '1', 10);

    if (query) {
      await fetchSearchResults();
    } else {
      loading = false;
    }

    await fetchSidebarData();
  });

  async function fetchSearchResults() {
    try {
      loading = true;
      imageLoadedStates = {}; // Reset image loaded states
      
      // Fetch anime
      const animeResp = await fetch(`/api/search?type=anime&q=${encodeURIComponent(query)}&page=${page}`);
      const animeJson = await animeResp.json();
      animeResults = animeJson.success ? animeJson.data.animes || [] : [];
      totalPagesAnime = animeJson.success ? animeJson.data.totalPages || 1 : 1;

      // Fetch manga (always use the same page variable)
      const mangaResp = await fetch(`/api/manga?type=search&q=${encodeURIComponent(query)}&page=${page}`);
      const mangaJson = await mangaResp.json();
      mangaResults = mangaJson.success ? mangaJson.data.results || [] : [];
      totalPagesManga = mangaJson.success ? mangaJson.data.totalPages || 1 : 1;
    } catch (e) {
      error = 'Failed to fetch search results';
    } finally {
      loading = false;
    }
  }

  async function fetchSidebarData() {
    try {
      const resp = await fetch(`/api/home`);
      const json = await resp.json();

      if (json.success) {
        top10Animes = json.data.top10Animes || {};
      } else {
        error = json.error || 'Failed to fetch sidebar data';
      }
    } catch (e) {
      error = 'Failed to fetch sidebar data';
    }
  }

  async function goToPage(newPage: number) {
    if (newPage >= 1 && newPage <= Math.max(totalPagesAnime, totalPagesManga)) {
      page = newPage;
      await fetchSearchResults();
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(query)}&page=${page}`);
    }
  }

  function setSidebarTab(tab: 'today' | 'week' | 'month') {
    sidebarTab = tab;
  }

  function handleImageLoad(id: string) {
    imageLoadedStates[id] = true;
  }
</script>

<svelte:head>
  <title>Search Results for "{query}" | ARMS Anime & Manga</title>
  <meta name="description" content={`Search results for "${query}" on ARMS Anime Streaming.`} /> 
</svelte:head>
<Navbar />

<div class="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pt-16">
  {#if loading}
    <div class="flex items-center justify-center flex-1">
      <img
        src="/assets/loader.gif"
        alt="Loading..."
        class="object-contain"
        style="max-width: 120px; max-height: 110px; aspect-ratio: 1 / 1;"
      />
    </div>
  {:else if error}
    <div class="flex-1 w-full">
      <div class="max-w-[125rem] mx-auto px-2 sm:px-6">
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-xl my-4">
          <p class="font-bold">ERROR: {error}</p>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex-1 w-full">
      <div class="max-w-[125rem] mx-auto flex flex-col gap-6 sm:gap-10 px-1 sm:px-6">
        <div class="flex flex-col xl:flex-row gap-6 sm:gap-10 w-full">
          <!-- Main content -->
          <div class="flex-1 flex flex-col gap-6 sm:gap-10">
            <!-- Anime Results -->
            <section class="max-w-[1800px] mx-auto px-1">
              <h2 class="text-xl sm:text-2xl font-bold text-orange-400 mb-4 sm:mb-6 flex items-center gap-3">
                <svg class="w-6 h-6 sm:w-7 sm:h-7 text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2v20m10-10H2" /></svg>
                Anime Results for "{query}"
              </h2>
              {#if animeResults.length === 0}
                <div class="text-gray-400">No anime found.</div>
              {:else}
                <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {#each animeResults as anime}
                    <a
                      href={`/info/${anime.id}`}
                      class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03]"
                      style="min-height: 120px;"
                    >
                      <!-- Type label -->
                      <span class="absolute top-2 left-2 z-10 bg-orange-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded shadow">
                        Anime
                      </span>
                      <div class="relative aspect-[3/4]">
                        <!-- Skeleton loader -->
                        {#if !imageLoadedStates[`anime-${anime.id}`]}
                          <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                        {/if}
                        <img
                          src={anime.poster}
                          alt={anime.name}
                          class="w-full h-full object-cover {imageLoadedStates[`anime-${anime.id}`] ? 'opacity-100' : 'opacity-0'}"
                          loading="lazy"
                          on:load={() => handleImageLoad(`anime-${anime.id}`)}
                        />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      </div>
                      <div class="absolute bottom-0 left-0 right-0 p-2">
                        <h3 class="font-semibold text-white text-xs mb-1 line-clamp-2 group-hover:text-orange-200 transition-colors" title={anime.name}>
                          {anime.name}
                        </h3>
                        {#if anime.type || anime.episodes}
                          <div class="flex flex-wrap gap-1">
                            {#if anime.type}
                              <span class="bg-orange-400 text-gray-900 px-2 py-0.5 rounded text-[10px] font-bold">{anime.type}</span>
                            {/if}
                            {#if anime.episodes}
                              <span class="bg-gray-900 text-orange-300 px-2 py-0.5 rounded text-[10px]">
                                {anime.episodes.sub} Sub / {anime.episodes.dub} Dub
                              </span>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    </a>
                  {/each}
                </div>
              {/if}
            </section>
            <!-- Manga Results (show only on page 1 and if there are results) -->
            {#if page === 1 && mangaResults.length > 0}
              <section class="max-w-[1800px] mx-auto px-1 mt-10">
                <h2 class="text-xl sm:text-2xl font-bold text-orange-400 mb-4 sm:mb-6 flex items-center gap-3">
                  <svg class="w-6 h-6 sm:w-7 sm:h-7 text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2v20m10-10H2" /></svg>
                  Manga Results for "{query}"
                </h2>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {#each mangaResults as manga}
                    <a
                      href={`/manga/info/${manga.id}`}
                      class="group relative bg-gray-800 rounded-xl overflow-hidden shadow border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03] transition-transform duration-200"
                      style="min-height: 120px;"
                    >
                      <!-- Type label -->
                      <span class="absolute top-2 left-2 z-10 bg-orange-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded shadow">
                        Manga
                      </span>
                      <div class="relative aspect-[3/4]">
                        <!-- Skeleton loader -->
                        {#if !imageLoadedStates[`manga-${manga.id}`]}
                          <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                        {/if}
                        <img
                          src={manga.image}
                          alt={manga.title?.english || manga.title?.romaji || manga.title?.native || manga.title}
                          class="w-full h-full object-cover {imageLoadedStates[`manga-${manga.id}`] ? 'opacity-100' : 'opacity-0'}"
                          loading="lazy"
                          on:load={() => handleImageLoad(`manga-${manga.id}`)}
                        />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      </div>
                      <div class="absolute bottom-0 left-0 right-0 p-2">
                        <h3 class="font-semibold text-white text-xs mb-1 line-clamp-2 group-hover:text-orange-200 transition-colors" title={manga.title?.english || manga.title?.romaji || manga.title?.native || manga.title}>
                          {manga.title?.english || manga.title?.romaji || manga.title?.native || manga.title}
                        </h3>
                      </div>
                    </a>
                  {/each}
                </div>
              </section>
            {/if}
            <!-- Pagination (uses max of both total pages) -->
            {#if totalPages > 1}
              <section class="flex justify-center items-center mt-6 gap-1 sm:gap-2 flex-wrap">
                {#if page > 1}
                  <button
                    class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition disabled:opacity-50"
                    on:click={() => goToPage(1)}
                    disabled={loading}
                    aria-label="First page"
                  >
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>
                  </button>
                  <button
                    class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition disabled:opacity-50"
                    on:click={() => goToPage(page - 1)}
                    disabled={loading}
                    aria-label="Previous page"
                  >
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                {/if}

                {#each pageNumbers as pageNum}
                  <button
                    class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-xs sm:text-sm transition disabled:opacity-50 {page === pageNum ? '!bg-orange-400 !text-gray-900' : ''}"
                    on:click={() => goToPage(pageNum)}
                    disabled={loading}
                  >
                    {pageNum}
                  </button>
                {/each}

                {#if page < totalPages}
                  <button
                    class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition disabled:opacity-50"
                    on:click={() => goToPage(page + 1)}
                    disabled={loading}
                    aria-label="Next page"
                  >
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                  <button
                    class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition disabled:opacity-50"
                    on:click={() => goToPage(totalPages)}
                    disabled={loading}
                    aria-label="Last page"
                  >
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
                  </button>
                {/if}
              </section>
            {/if}
          </div>
          <!-- Sidebar Section -->
          <Sidebar
            sidebarTab={sidebarTab}
            setSidebarTab={(tab) => sidebarTab = tab}
            top10Today={top10Animes.today ?? []}
            top10Week={top10Animes.week ?? []}
            top10Month={top10Animes.month ?? []}
          />
        </div>
      </div>
    </div>
  {/if}
  <Footer />
</div>

<style>
  .text-orange-400 {
    color: #fbbf24; /* orange-400 */
  }

  .hover\:bg-orange-400:hover {
    background-color: #fbbf24; /* orange-400 */
  }

  .bg-gray-800 {
    background-color: #1f2937; /* gray-800 */
  }

  .text-gray-400 {
    color: #9ca3af; /* gray-400 */
  }

  /* Button Styles */
  button {
    background-color: #1f2937; /* gray-800 */
    color: #fbbf24; /* orange-400 */
    border-radius: 0.5rem;
    transition: background-color 0.3s, transform 0.2s, border-color 0.3s;
    border: 2px solid transparent;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  button:hover {
    background-color: #fbbf24; /* orange-400 */
    color: #1f2937; /* gray-900 */
    transform: scale(1.03);
    border-color: #fbbf24; /* orange-400 */
  }

  /* Skeleton Loader Animation */
  .skeleton-loader {
    background: linear-gradient(
      90deg,
      #374151 0%,
      #4b5563 20%,
      #374151 40%,
      #374151 100%
    );
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
  }

  @keyframes skeleton-loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  img {
    transition: opacity 0.3s ease-in-out;
  }
</style>