<script lang="ts">
  export let episodes: any[] = [];
  export let pagedEpisodes: any[] = [];
  export let episodeRanges: string[] = [];
  export let currentPage: number = 1;
  export let currentEpisodeId: string = '';
  export let handlePageChange: (event: Event) => void;
  export let goToEpisode: (episodeId: string) => void;
  export let searchedEpisode: string | null = null;
  export let animeType: string | undefined | null = '';

  function getEpisodeDisplayInfo(ep: any) {
    if (ep.title) {
      return { number: ep.number, title: ep.title };
    }

    const type = animeType?.toUpperCase();
    if (type === 'MOVIE') return { number: ep.number, title: 'Full Movie' };
    if (type === 'OVA') return { number: ep.number, title: `OVA ${ep.number}` };
    if (type === 'SPECIAL') return { number: ep.number, title: `Special ${ep.number}` };
    
    return { number: ep.number, title: `Episode ${ep.number}` };
  }
</script>

{#if episodes.length > 0}
  <div class="mb-2 flex flex-col gap-1">
    {#if episodes.length > 30}
      <!-- Grid View for many episodes -->
      <div class="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-10 gap-1">
        {#each pagedEpisodes as ep, index}
          {@const isActive = currentEpisodeId === ep.episodeId}
          {@const isSearched = searchedEpisode === ep.episodeId}
          <button
            data-episode-id={ep.episodeId}
            title={ep.title || `Episode ${ep.number}`}
            class="flex items-center justify-center rounded-sm h-8 text-xs sm:text-sm font-bold cursor-pointer transition
              {isActive 
                ? 'bg-orange-400 text-black' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}
              {isSearched && !isActive ? 'ring-2 ring-orange-400 animate-pulse' : ''}"
            on:click={() => { goToEpisode(ep.episodeId); }}
            disabled={isActive}
          >
            {ep.number}
          </button>
        {/each}
      </div>
    {:else}
      <!-- List View for fewer episodes -->
      <div class="flex flex-col max-h-[50vh] sm:max-h-none overflow-y-auto sm:overflow-visible">
        {#each episodes as ep, index}
          {@const isActive = currentEpisodeId === ep.episodeId}
          {@const isSearched = searchedEpisode === ep.episodeId}
          {@const display = getEpisodeDisplayInfo(ep)}
          <button
            data-episode-id={ep.episodeId}
            class="w-full pl-3 pr-4 py-2.5 flex items-center gap-3 cursor-pointer transition group
              {isActive 
                ? 'bg-gray-800 text-orange-400' 
                : (index + 1) % 2 === 0 
                  ? 'bg-gray-900 text-gray-400 hover:bg-gray-800' 
                  : 'bg-transparent text-gray-400 hover:bg-gray-800'}
              {isSearched && !isActive ? 'ring-2 ring-inset ring-orange-400 animate-pulse' : ''}"
            on:click={() => { goToEpisode(ep.episodeId); }}
            disabled={isActive}
          >
            <span class="text-sm font-bold min-w-[2rem]">{display.number}</span>
            <div class="flex-1 flex items-center justify-between gap-2 min-w-0">
              <h3 class="text-sm font-semibold text-left line-clamp-1 group-hover:text-orange-400 transition">
                {display.title}
              </h3>
              {#if isActive}
                <svg class="w-4 h-4 text-orange-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Scrollbar styling for mobile list */
  :global(.flex.flex-col.max-h-\[50vh\]::-webkit-scrollbar) {
    width: 4px;
  }

  :global(.flex.flex-col.max-h-\[50vh\]::-webkit-scrollbar-track) {
    background: rgba(31, 41, 55, 0.5);
    border-radius: 0.25rem;
  }

  :global(.flex.flex-col.max-h-\[50vh\]::-webkit-scrollbar-thumb) {
    background: rgba(249, 115, 22, 0.5);
    border-radius: 0.25rem;
  }

  :global(.flex.flex-col.max-h-\[50vh\]::-webkit-scrollbar-thumb:hover) {
    background: rgba(249, 115, 22, 0.7);
  }
</style>