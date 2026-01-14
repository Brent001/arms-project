<script lang="ts">
  import { onMount } from 'svelte';
  export let charactersVoiceActors: any[] = [];
  export let onClose: () => void;
  export let handleBackdrop: (event: MouseEvent) => void;
  export let animeId: string;

  let loading = true;
  let characters: any[] = [];
  let currentPage = 1;
  let totalPages = 1;

  async function fetchCharacters(page: number = 1) {
    loading = true;
    try {
      const resp = await fetch(`/api/characters?animeId=${animeId}&page=${page}`);
      const data = await resp.json();
      if (data.success && data.data) {
        characters = data.data.data;
        totalPages = data.data.totalPages || 1;
        currentPage = data.data.currentPage || page;
      } else {
        characters = [];
        totalPages = 1;
        currentPage = 1;
      }
    } catch (error) {
      console.error('Failed to fetch characters:', error);
      characters = [];
      totalPages = 1;
      currentPage = 1;
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    await fetchCharacters(1);
  });

  /**
   * Generates pagination: shows 3 pages centered around current page
   * Example: if currentPage is 3, shows [2, 3, 4]
   */
  $: pageNumbers = (() => {
    let pages: number[] = [];
    
    // Calculate the range to show 3 pages centered around current page
    let start = Math.max(1, currentPage - 1);
    let end = Math.min(totalPages, start + 2);
    
    // If we're near the end, adjust to always show 3 pages
    if (end - start < 2) {
      start = Math.max(1, end - 2);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  })();

  function goToPage(page: any) {
    if (page !== '...' && page !== currentPage) {
      fetchCharacters(page);
    }
  }
</script>

{#if charactersVoiceActors && charactersVoiceActors.length}
  <div
    class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    on:click={handleBackdrop}
    on:keydown={(e) => { if (e.key === 'Escape') onClose(); }}
  >
    <div class="relative bg-[#0b1120] rounded-xl shadow-2xl max-w-5xl w-full h-full max-h-[92vh] overflow-hidden flex flex-col border border-gray-800">
      
      <div class="p-4 sm:p-5 border-b border-gray-800 flex justify-between items-center bg-[#0f172a]">
        <h2 class="text-xl font-bold text-orange-400">Characters & Voice Actors</h2>
        <button on:click={onClose} class="text-gray-400 hover:text-white transition-colors p-1" aria-label="Close modal">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
        {#if loading}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            {#each Array(10) as _}
              <div class="flex items-center justify-between p-3 bg-gray-800/20 rounded-lg border border-gray-700/30 animate-pulse">
                <div class="flex gap-3 items-center min-w-0 flex-1">
                  <div class="w-14 h-14 rounded-lg bg-gray-700 flex-shrink-0"></div>
                  <div class="flex flex-col min-w-0 gap-2 flex-1">
                    <div class="h-4 bg-gray-700 rounded w-32"></div>
                    <div class="h-3 bg-gray-700 rounded w-20"></div>
                  </div>
                </div>
                <div class="flex -space-x-2.5 items-center pr-1">
                  {#each Array(3) as _}
                    <div class="w-10 h-10 rounded-full bg-gray-700 border-2 border-[#0b1120]"></div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {:else if characters.length === 0}
          <p class="text-gray-400 text-center py-10">No characters found.</p>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            {#each characters as item}
              <div class="flex items-center justify-between p-3 bg-gray-800/20 rounded-lg border border-gray-700/30 hover:bg-gray-800/50 transition-all group">
                <div class="flex gap-3 items-center min-w-0">
                  <img 
                    src={item.character.poster} 
                    alt="" 
                    class="w-14 h-14 rounded-lg object-cover bg-gray-900 border border-gray-700/50" 
                    on:error={(e) => { if (e.target) (e.target as HTMLImageElement).src = "https://i.postimg.cc/HnHKvHpz/no-avatar.jpg"; }}
                  />
                  <div class="flex flex-col min-w-0">
                    <h3 class="text-sm font-semibold text-gray-100 truncate group-hover:text-orange-400 transition-colors">
                        {item.character.name}
                    </h3>
                    <p class="text-[10px] text-gray-500 font-medium uppercase tracking-tight">{item.character.cast || 'Main'}</p>
                  </div>
                </div>

                {#if item.voiceActors?.length > 0}
                  <div class="flex -space-x-2.5 items-center pr-1">
                    {#each item.voiceActors.slice(0, 3) as va}
                      <img 
                        src={va.poster} 
                        title={va.name} 
                        alt="" 
                        class="w-10 h-10 rounded-full border-2 border-[#0b1120] object-cover ring-1 ring-gray-700/50" 
                        on:error={(e) => { if (e.target) (e.target as HTMLImageElement).src = "https://i.postimg.cc/HnHKvHpz/no-avatar.jpg"; }}
                      />
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      {#if totalPages > 1 && !loading}
        <div class="p-2 sm:p-4 border-t border-gray-800 flex justify-center items-center gap-1 sm:gap-1.5 flex-wrap bg-[#0b1120]">
          {#if currentPage > 1}
            <button
              class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg font-bold text-xs bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition disabled:opacity-50"
              on:click={() => goToPage(1)}
              disabled={false}
              aria-label="First page"
            >
              <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>
            </button>
            <button
              class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg font-bold text-xs bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition disabled:opacity-50"
              on:click={() => goToPage(currentPage - 1)}
              disabled={false}
              aria-label="Previous page"
            >
              <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          {/if}

          {#each pageNumbers as pageNum}
            <button
              class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg font-bold text-xs transition disabled:opacity-50
                {currentPage === pageNum
                  ? 'bg-orange-400 text-gray-900'
                  : 'bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900'}"
              on:click={() => goToPage(pageNum)}
              disabled={false}
            >
              {pageNum}
            </button>
          {/each}

          {#if currentPage < totalPages}
            <button
              class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg font-bold text-xs bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition disabled:opacity-50"
              on:click={() => goToPage(currentPage + 1)}
              disabled={false}
              aria-label="Next page"
            >
              <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <button
              class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg font-bold text-xs bg-gray-800 text-white hover:bg-orange-400 hover:text-gray-900 transition disabled:opacity-50"
              on:click={() => goToPage(totalPages)}
              disabled={false}
              aria-label="Last page"
            >
              <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 5px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.1);
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #1e293b;
    border-radius: 20px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #334155;
  }
</style>