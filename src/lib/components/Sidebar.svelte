<script lang="ts">
  export let sidebarTab: 'today' | 'week' | 'month' = 'today';
  export let setSidebarTab: (tab: 'today' | 'week' | 'month') => void;
  export let top10Today: any[] = [];
  export let top10Week: any[] = [];
  export let top10Month: any[] = [];
</script>

<aside class="w-full xl:w-80 flex-shrink-0 flex flex-col gap-8 mt-8 xl:mt-0">
  <div>
    <div class="flex flex-col gap-2 sm:gap-3">
      <!-- Top 10 Heading -->
      <div class="flex flex-row items-center justify-between mb-3 sm:mb-4 w-full gap-2">
        <span class="flex items-center gap-2 font-bold text-orange-400 text-xl sm:text-2x0 whitespace-nowrap">
          <!-- Lightning bolt icon (same as main page) -->
          <svg class="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Top 10
        </span>
        <div class="flex flex-row gap-1 bg-gray-900 rounded-[6px] overflow-hidden">
          <button
            class="flex-1 px-3 py-2 font-bold text-[11px] sm:px-4 sm:text-xs transition
              {sidebarTab === 'today' ? 'bg-orange-400 text-gray-900' : 'bg-gray-900 text-white hover:bg-orange-400 hover:text-gray-900'}"
            on:click={() => setSidebarTab('today')}
          >Today</button>
          <button
            class="flex-1 px-3 py-2 font-bold text-[11px] sm:px-4 sm:text-xs transition
              {sidebarTab === 'week' ? 'bg-orange-400 text-gray-900' : 'bg-gray-900 text-white hover:bg-orange-400 hover:text-gray-900'}"
            on:click={() => setSidebarTab('week')}
          >Week</button>
          <button
            class="flex-1 px-3 py-2 font-bold text-[11px] sm:px-4 sm:text-xs transition
              {sidebarTab === 'month' ? 'bg-orange-400 text-gray-900' : 'bg-gray-900 text-white hover:bg-orange-400 hover:text-gray-900'}"
            on:click={() => setSidebarTab('month')}
          >Month</button>
        </div>
      </div>
      <div>
        {#if sidebarTab === 'today'}
          <div class="flex flex-col gap-1 sm:gap-1">
            {#each top10Today.slice(0, 10) as anime, i}
              <a href={`/info/${anime.id}`} class="group flex items-center gap-2 bg-gray-800 rounded-lg p-1.5 sm:p-2 hover:bg-orange-400 hover:text-gray-900 transition">
                <span
                  class="font-bold text-[1.15rem] w-7 text-center transition-colors
                    {i < 3 ? 'text-orange-400 group-hover:text-gray-900' : 'text-gray-400 group-hover:text-gray-900'}"
                >{String(i+1).padStart(2, '0')}</span>
                <img src={anime.poster} alt={anime.name} class="w-9 h-12 sm:w-12 sm:h-16 object-cover rounded-md" />
                <div class="flex-1 min-w-0">
                  <div
                    class="font-semibold truncate text-[11px] sm:text-xs max-w-full"
                    style="max-width:100%;"
                    title={anime.name}
                  >
                    {anime.name}
                  </div>
                </div>
              </a>
            {/each}
          </div>
        {:else if sidebarTab === 'week'}
          <div class="flex flex-col gap-1 sm:gap-1">
            {#each top10Week.slice(0, 10) as anime, i}
              <a href={`/info/${anime.id}`} class="group flex items-center gap-2 bg-gray-800 rounded-lg p-1.5 sm:p-2 hover:bg-orange-400 hover:text-gray-900 transition">
                <span
                  class="font-bold text-[1.15rem] w-7 text-center transition-colors
                    {i < 3 ? 'text-orange-400 group-hover:text-gray-900' : 'text-gray-400 group-hover:text-gray-900'}"
                >{String(i+1).padStart(2, '0')}</span>
                <img src={anime.poster} alt={anime.name} class="w-9 h-12 sm:w-12 sm:h-16 object-cover rounded-md" />
                <div class="flex-1 min-w-0">
                  <div
                    class="font-semibold truncate text-[11px] sm:text-xs max-w-full"
                    style="max-width:100%;"
                    title={anime.name}
                  >
                    {anime.name}
                  </div>
                </div>
              </a>
            {/each}
          </div>
        {:else if sidebarTab === 'month'}
          <div class="flex flex-col gap-1 sm:gap-1">
            {#each top10Month.slice(0, 10) as anime, i}
              <a href={`/info/${anime.id}`} class="group flex items-center gap-2 bg-gray-800 rounded-lg p-1.5 sm:p-2 hover:bg-orange-400 hover:text-gray-900 transition">
                <span
                  class="font-bold text-[1.15rem] w-7 text-center transition-colors
                    {i < 3 ? 'text-orange-400 group-hover:text-gray-900' : 'text-gray-400 group-hover:text-gray-900'}"
                >{String(i+1).padStart(2, '0')}</span>
                <img src={anime.poster} alt={anime.name} class="w-9 h-12 sm:w-12 sm:h-16 object-cover rounded-md" />
                <div class="flex-1 min-w-0">
                  <div
                    class="font-semibold truncate text-[11px] sm:text-xs max-w-full"
                    style="max-width:100%;"
                    title={anime.name}
                  >
                    {anime.name}
                  </div>
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</aside>