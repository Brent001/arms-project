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
   * Generates pagination: [1, 2, 3, 4, ..., Last]
   */
  $: pageNumbers = (() => {
    let pages: (number | string)[] = [];
    const sidePages = 2; // Pages to show around current page
    
    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first few
      pages.push(1, 2, 3, 4);
      
      if (currentPage > 4 && currentPage < totalPages) {
         // If user navigates deep, ensure current page is visible
         if (!pages.includes(currentPage)) pages.push(currentPage);
      }

      if (totalPages > 5) {
        // pages.push('...');
      }
    }
    // Remove duplicates and sort
    return [...new Set(pages)].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : 0));
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
          <div class="flex justify-center items-center h-64">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
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
        <div class="p-4 sm:p-6 border-t border-gray-800 flex justify-center items-center gap-1.5 sm:gap-2 bg-[#0b1120]">
          
          {#each pageNumbers as page}
            <button
              on:click={() => goToPage(page)}
              class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm transition-all
              {currentPage === page 
                ? 'bg-orange-500 text-gray-900 shadow-lg shadow-orange-500/20' 
                : 'bg-slate-800/40 text-gray-300 hover:bg-slate-700 hover:text-white border border-gray-700/50'}"
            >
              {page}
            </button>
          {/each}

          <button
            on:click={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-slate-800/40 text-gray-300 hover:bg-slate-700 hover:text-white disabled:opacity-20 border border-gray-700/50 transition-all"
            aria-label="Next page"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>

          <button
            on:click={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-slate-800/40 text-gray-300 hover:bg-slate-700 hover:text-white disabled:opacity-20 border border-gray-700/50 transition-all"
            aria-label="Last page"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
            </svg>
          </button>
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