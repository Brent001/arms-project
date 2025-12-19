<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';

  export let data: {
    list: string;
  };

  let currentList = data.list || 'anime';
  let items: any[] = [];
  let imageLoadedStates: { [key: string]: boolean } = {};
  let currentPage = 1;
  const itemsPerPage = 24;

  // Reset image loaded states when the items change
  $: if (currentList) {
    loadItems();
    currentPage = 1; // Reset to first page when switching lists
  }

  $: totalPages = Math.ceil(items.length / itemsPerPage);
  $: paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  onMount(() => {
    const list = $page.url.searchParams.get('list');
    if (list === 'manga' || list === 'anime') {
      currentList = list;
    }
    loadItems();
  });

  function loadItems() {
    if (browser) {
      if (currentList === 'anime') {
        items = JSON.parse(localStorage.getItem('recentAnime') || '[]');
      } else {
        items = JSON.parse(localStorage.getItem('recentManga') || '[]');
      }
      items.sort((a, b) => {
        const aDate = new Date(a.lastWatchedAt || a.lastReadAt || 0);
        const bDate = new Date(b.lastWatchedAt || b.lastReadAt || 0);
        return bDate.getTime() - aDate.getTime();
      });
    }
  }

  function getEpisodeLabel(type: string, episodeNumber: string | number): string {
    const animeType = type?.toUpperCase();
    
    switch (animeType) {
      case 'MOVIE':
      case 'Movie':
      case 'movie':
        return 'Full Movie';
      case 'OVA':
        return `OVA ${episodeNumber}`;
      case 'SPECIAL':
        return `Special ${episodeNumber}`;
      case 'ONA':
        return `ONA ${episodeNumber}`;
      default:
        return `Episode ${episodeNumber}`;
    }
  }

  function extractEpisodeNumber(item: any): string {
    // First try to use the lastEpisodeNumber if it exists
    if (item.lastEpisodeNumber) {
      return item.lastEpisodeNumber;
    }
    
    // Otherwise, try to extract from the episode ID
    const epId = item.lastEpisodeId || '';
    const match = epId.match(/ep=(\d+)|episode-(\d+)|ep-(\d+)|(\d+)$/);
    
    if (match) {
      return match[1] || match[2] || match[3] || match[4];
    }
    
    return epId;
  }

  function switchList(list: string) {
    currentList = list;
    if (browser) {
      const url = new URL(window.location.href);
      url.searchParams.set('list', list);
      history.replaceState({}, '', url);
    }
  }

  function changePage(page: number) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }

  function handleImageLoad(id: string) {
    imageLoadedStates[id] = true;
  }

  function removeItem(itemToRemove: any) {
    items = items.filter(item => item !== itemToRemove);
    if (browser) {
      const storageKey = currentList === 'anime' ? 'recentAnime' : 'recentManga';
      localStorage.setItem(storageKey, JSON.stringify(items));
    }
  }

  function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset.errorHandled) {
      img.dataset.errorHandled = 'true';
      img.onerror = null; // Prevent infinite loop
    }
  }
</script>

<svelte:head>
  <title>Continue - ARMS Anime</title>
  <meta name="description" content="Continue watching anime or reading manga." />
</svelte:head>

<Navbar />

<div class="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pt-16">
  <div class="flex-1 w-full">
    <div class="max-w-[125rem] mx-auto flex flex-col gap-6 sm:gap-10 px-1 sm:px-2">
      <section class="mb-4 sm:mb-8 flex justify-between items-start">
        <div>
          <h1 class="text-3xl sm:text-4xl font-bold text-orange-400 mb-4">Continue</h1>
          <p class="text-gray-300 text-sm sm:text-base">
            Continue {currentList === 'anime' ? 'watching anime' : 'reading manga'}.
          </p>
          {#if items.length > 0}
            <p class="text-gray-400 text-xs mt-2">
              Page {currentPage} of {totalPages} • {items.length} {currentList === 'anime' ? 'anime' : 'manga'}
            </p>
          {/if}
        </div>
        <div class="bg-gray-800 rounded-lg p-0.5 flex flex-wrap">
          <button
            class="px-3 py-1.5 text-sm rounded-md font-semibold transition {currentList === 'anime' ? 'bg-orange-400 text-gray-900' : 'text-white hover:bg-gray-700'}"
            on:click={() => switchList('anime')}
          >
            Anime
          </button>
          <button
            class="px-3 py-1.5 text-sm rounded-md font-semibold transition {currentList === 'manga' ? 'bg-orange-400 text-gray-900' : 'text-white hover:bg-gray-700'}"
            on:click={() => switchList('manga')}
          >
            Manga
          </button>
        </div>
      </section>

      <!-- Content -->
      {#if items && items.length > 0}
        <section class="max-w-[1800px] mx-auto px-1">
          <div class="grid grid-cols-2 md:grid-cols-6 gap-2">
            {#each paginatedItems as item (item.id || item.anilistId)}
              <a
                href={currentList === 'anime' ? `/watch/${item.lastEpisodeId}` : `/manga/read/${item.anilistId}/${item.mangaId}/${item.lastChapterId}?provider=${item.provider}`}
                class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03]"
                style="min-height: 120px;"
              >
                <div class="relative aspect-[3/4]">
                  {#if !imageLoadedStates[item.id || item.anilistId]}
                    <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                  {/if}
                  <img
                    src={item.poster}
                    alt={item.mangaTitle || item.name}
                    class="w-full h-full object-cover {imageLoadedStates[item.id || item.anilistId] ? 'opacity-100' : 'opacity-0'}"
                    loading="lazy"
                    on:load={() => handleImageLoad(item.id || item.anilistId)}
                    on:error={handleImageError}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <!-- Remove button -->
                  <button
                    class="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-base font-black transition-colors"
                    on:click|stopPropagation={() => removeItem(item)}
                    aria-label="Remove from continue list"
                  >
                    ×
                  </button>
                </div>
                <div class="absolute bottom-0 left-0 right-0 p-2">
                  <h3
                    class="font-semibold text-white text-xs mb-1 line-clamp-2 group-hover:text-orange-200 transition-colors"
                    title={item.mangaTitle || item.name}
                  >
                    {item.mangaTitle || item.name}
                  </h3>
                  <div class="flex flex-wrap gap-1">
                    {#if currentList === 'anime'}
                      <span class="bg-orange-400 text-gray-900 px-2 py-0.5 rounded text-[10px] font-bold">Anime</span>
                      <span class="bg-gray-900 text-orange-300 px-2 py-0.5 rounded text-[10px]">
                        {getEpisodeLabel(item.type, extractEpisodeNumber(item))}
                      </span>
                    {:else}
                      <span class="bg-orange-400 text-gray-900 px-2 py-0.5 rounded text-[10px] font-bold">Manga</span>
                      <span class="bg-gray-900 text-orange-300 px-2 py-0.5 rounded text-[10px]">
                        {item.name}
                      </span>
                    {/if}
                  </div>
                </div>
              </a>
            {/each}
          </div>
        </section>

        {#if totalPages > 1}
          <section class="flex justify-center items-center mt-6 gap-1 sm:gap-2 flex-wrap">
            {#if currentPage > 1}
              <button
                class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition"
                on:click={() => changePage(1)}
                aria-label="First page"
              >
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>
              </button>
              <button
                class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition"
                on:click={() => changePage(currentPage - 1)}
                aria-label="Previous page"
              >
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            {/if}

            {#each Array(Math.min(5, totalPages)) as _, i}
              {@const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i}
              {#if pageNum <= totalPages}
                <button
                  class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-xs sm:text-sm transition
                    {currentPage === pageNum
                      ? 'bg-orange-400 text-gray-900'
                      : 'bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900'}"
                  on:click={() => changePage(pageNum)}
                >
                  {pageNum}
                </button>
              {/if}
            {/each}

            {#if currentPage < totalPages}
              <button
                class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition"
                on:click={() => changePage(currentPage + 1)}
                aria-label="Next page"
              >
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <button
                class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition"
                on:click={() => changePage(totalPages)}
                aria-label="Last page"
              >
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
              </button>
            {/if}
          </section>
        {/if}
      {:else}
        <div class="text-center py-12">
          <p class="text-gray-400 text-lg">No recent {currentList} activity found.</p>
        </div>
      {/if}
    </div>
  </div>

  <Footer />
</div>

<style>
  /* Skeleton Loader - plain background for performance */
  .skeleton-loader {
    background-color: #374151; /* gray-700 */
  }

  img {
    transition: opacity 0.3s ease-in-out;
  }
</style>