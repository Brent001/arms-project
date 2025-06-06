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
  let sidebarTab: 'airing' | 'upcoming' = 'airing';

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
        topAiringAnimes = json.data.topAiringAnimes || [];
        topUpcomingAnimes = json.data.topUpcomingAnimes || [];
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

  function setSidebarTab(tab: 'airing' | 'upcoming') {
    sidebarTab = tab;
  }
</script>

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
                <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
                  {#each animeResults as anime}
                    <a href={`/info/${anime.id}`} class="anime-card group">
                      <img src={anime.poster} alt={anime.name} class="w-full h-48 object-cover rounded-lg" />
                      <div class="p-4">
                        <h3 class="font-bold text-lg truncate group-hover:text-orange-400 transition">{anime.name}</h3>
                        <p class="text-gray-300 text-sm">{anime.description}</p>
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
                <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
                  {#each mangaResults as manga}
                    <a href={`/manga/info/${manga.id}`} class="anime-card group">
                      <img src={manga.image} alt={manga.title?.english || manga.title?.romaji || manga.title?.native || manga.title} class="w-full h-48 object-cover rounded-lg" />
                      <div class="p-4">
                        <h3 class="font-bold text-lg truncate group-hover:text-orange-400 transition">
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
            {sidebarTab}
            setSidebarTab={(tab) => sidebarTab = tab}
            topAiringAnimes={topAiringAnimes}
            topUpcomingAnimes={topUpcomingAnimes}
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


  .text-gray-300 {
    color: #d1d5db; /* gray-300 */
  }

  .text-gray-400 {
    color: #9ca3af; /* gray-400 */
  }


  .anime-card {
    background: linear-gradient(to bottom right, #1f2937, #111827); /* gray-800 to gray-900 gradient */
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s, color 0.3s;
    border: 2px solid transparent;
  }

  .anime-card:hover {
    transform: scale(1.03);
    box-shadow: 0 6px 8px rgba(251, 191, 36, 0.4); /* orange-400 glow */
    border-color: #fbbf24; /* orange-400 */
  }

  .anime-card img {
    transition: brightness 0.3s, transform 0.3s;
  }

  .anime-card:hover img {
    filter: brightness(90%);
    transform: scale(1.05); /* Slight zoom effect */
  }

  .anime-card .p-4 {
    transition: color 0.3s;
    color: #ffffff; /* Default text color */
  }

  .anime-card:hover .p-4 {
    color: #fbbf24; /* orange-400 text color on hover */
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