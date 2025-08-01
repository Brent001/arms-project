<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  type Anime = {
    id: string;
    name: string;
    poster: string;
    duration: string;
    type: string;
    rating: string | null;
    episodes: {
      sub: number;
      dub: number | null;
    };
  };

  export let data: {
    animes: Array<Anime>;
    currentPage: number;
    totalPages: number;
  };

  let loading = false;
  let error: string | null = null;

  const pagesPerGroup = 3;
  $: startPage = Math.max(1, data.currentPage - Math.floor(pagesPerGroup / 2));
  $: endPage = Math.min(data.totalPages, startPage + pagesPerGroup - 1);

  async function loadPage(newPage: number) {
    if (newPage === data.currentPage || newPage < 1 || newPage > data.totalPages) {
      return;
    }

    loading = true;
    error = null;

    try {
      const newUrl = new URL($page.url);
      if (newPage === 1) {
        newUrl.searchParams.delete('page');
      } else {
        newUrl.searchParams.set('page', newPage.toString());
      }
      await goto(newUrl.toString(), { replaceState: true, noScroll: true });

      const apiUrl = `/api/added?page=${newPage}`;
      const resp = await fetch(apiUrl);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }

      const json = await resp.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to load page');
      }

      if (!json.data) {
        throw new Error('Invalid response format');
      }

      data = {
        ...data,
        animes: json.data.animes || [],
        currentPage: json.data.currentPage || newPage,
        totalPages: json.data.totalPages || data.totalPages,
      };

    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load page';
      const revertUrl = new URL($page.url);
      if (data.currentPage === 1) {
        revertUrl.searchParams.delete('page');
      } else {
        revertUrl.searchParams.set('page', data.currentPage.toString());
      }
      goto(revertUrl.toString(), { replaceState: true, noScroll: true });
    } finally {
      loading = false;
    }
  }

  function goToPage(newPage: number) {
    if (newPage >= 1 && newPage <= data.totalPages && !loading) {
      loadPage(newPage);
    }
  }

  $: pageNumbers = Array.from(
    { length: endPage - startPage + 1 }, 
    (_, i) => startPage + i
  );
</script>

<svelte:head>
  <title>Recently Added Anime - ARMS Anime</title>
  <meta name="description" content={`Browse the latest completed anime series. Page ${data.currentPage} of ${data.totalPages}.`} />
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
  {:else}
    <div class="flex-1 w-full">
      <div class="max-w-[125rem] mx-auto flex flex-col gap-6 sm:gap-10 px-2 sm:px-6">
        {#if error}
          <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-xl my-4">
            <p class="font-bold">ERROR: {error}</p>
            <button 
              class="mt-2 px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
              on:click={() => { error = null; loadPage(data.currentPage || 1); }}
            >
              Try Again
            </button>
          </div>
        {:else}
          <!-- Header for Latest Completed -->
          <section class="mb-4 sm:mb-8">
            <h1 class="text-3xl sm:text-4xl font-bold text-orange-400 mb-4">
              Recently Added
            </h1>
            <p class="text-gray-300 text-sm sm:text-base">
              Browse the most recently added anime series.
            </p>
            <p class="text-gray-400 text-xs mt-2">
              Page {data.currentPage} of {data.totalPages} • {data.animes?.length || 0} animes
            </p>
          </section>

          <!-- Anime Grid -->
          <section class="max-w-[1800px] mx-auto px-2">
            {#if data.animes && data.animes.length > 0}
              <div class="grid grid-cols-2 md:grid-cols-6 gap-2">
                {#each data.animes as anime (anime.id)}
                  <a
                    href={`/info/${anime.id}`}
                    class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03]"
                    style="min-height: 120px;"
                  >
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
                      <h3
                        class="font-semibold text-white text-xs mb-1 line-clamp-2 group-hover:text-orange-200 transition-colors"
                        title={anime.name}
                      >
                        {anime.name}
                      </h3>
                      <div class="flex flex-wrap gap-1">
                        <span class="bg-orange-400 text-gray-900 px-2 py-0.5 rounded text-[10px] font-bold">{anime.type}</span>
                        <span class="bg-gray-900 text-orange-300 px-2 py-0.5 rounded text-[10px]">
                          {anime.episodes.sub} Sub{anime.episodes.dub ? ` / ${anime.episodes.dub} Dub` : ' / No Dub'}
                        </span>
                      </div>
                    </div>
                  </a>
                {/each}
              </div>
            {:else}
              <div class="text-center py-12">
                <p class="text-gray-400 text-lg">No completed animes found.</p>
              </div>
            {/if}
          </section>

          <!-- Pagination Controls -->
          {#if data.totalPages > 1}
            <section class="flex justify-center items-center mt-6 gap-2 flex-wrap">
              {#if data.currentPage > 1}
                <button
                  class="px-3 py-2 rounded-lg font-bold text-sm bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition disabled:opacity-50"
                  on:click={() => goToPage(1)}
                  disabled={loading}
                >
                  ««
                </button>
                <button
                  class="px-3 py-2 rounded-lg font-bold text-sm bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition disabled:opacity-50"
                  on:click={() => goToPage(data.currentPage - 1)}
                  disabled={loading}
                >
                  «
                </button>
              {/if}

              {#each pageNumbers as pageNum}
                <button
                  class="px-3 py-2 rounded-lg font-bold text-sm transition disabled:opacity-50
                    {data.currentPage === pageNum
                      ? 'bg-orange-400 text-gray-900'
                      : 'bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900'}"
                  on:click={() => goToPage(pageNum)}
                  disabled={loading}
                >
                  {pageNum}
                </button>
              {/each}

              {#if data.currentPage < data.totalPages}
                <button
                  class="px-3 py-2 rounded-lg font-bold text-sm bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition disabled:opacity-50"
                  on:click={() => goToPage(data.currentPage + 1)}
                  disabled={loading}
                >
                  »
                </button>
                <button
                  class="px-3 py-2 rounded-lg font-bold text-sm bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition disabled:opacity-50"
                  on:click={() => goToPage(data.totalPages)}
                  disabled={loading}
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