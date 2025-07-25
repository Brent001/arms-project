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
</script>

<svelte:head>
  <title>Search Results for "{query}" | ARMS Anime & Manga</title>
  <meta name="description" content={`Search results for "${query}" on ARMS Anime Streaming.`} /> 
</svelte:head>
<Navbar />

<div class="min-h-screen flex flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pt-16">
  <div class="flex-1 w-full">
    <div class="max-w-[125rem] mx-auto flex flex-col gap-6 sm:gap-10 px-2 sm:px-6">
      {#if loading}
        <div class="fixed inset-0 flex items-center justify-center z-50">
          <img
            src="/assets/loader.gif"
            alt="Loading..."
            class="object-contain"
            style="max-width: 120px; max-height: 110px; aspect-ratio: 1 / 1;"
          />
        </div>
      {:else if error}
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-xl my-4">
          <p class="font-bold">ERROR: {error}</p>
        </div>
      {:else}
        <div class="flex flex-col xl:flex-row gap-6 sm:gap-10 w-full">
          <!-- Main content -->
          <div class="flex-1 flex flex-col gap-6 sm:gap-10">
            <!-- Anime Results -->
            <section class="max-w-[1800px] mx-auto px-2">
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
                        <img
                          src={anime.poster}
                          alt={anime.name}
                          class="w-full h-full object-cover"
                          loading="lazy"
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
              <section class="max-w-[1800px] mx-auto px-2 mt-10">
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
                        <img
                          src={manga.image}
                          alt={manga.title?.english || manga.title?.romaji || manga.title?.native || manga.title}
                          class="w-full h-full object-cover"
                          loading="lazy"
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
            <div class="flex justify-center mt-8">
              {#if page > 1}
                <button class="px-4 py-2 bg-gray-800 text-orange-400 rounded-lg hover:bg-orange-400 hover:text-gray-900 transition" on:click={() => goToPage(page - 1)}>Previous</button>
              {/if}
              <span class="px-4 py-2 text-gray-400">Page {page} of {Math.max(totalPagesAnime, totalPagesManga)}</span>
              {#if page < Math.max(totalPagesAnime, totalPagesManga)}
                <button class="px-4 py-2 bg-gray-800 text-orange-400 rounded-lg hover:bg-orange-400 hover:text-gray-900 transition" on:click={() => goToPage(page + 1)}>Next</button>
              {/if}
            </div>
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
      {/if}
    </div>
  </div>
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

</style>