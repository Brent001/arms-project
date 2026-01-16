<script lang="ts">
  type Server = {
    serverId: number;
    serverName: string;
    category: 'sub' | 'dub' | 'raw';
  };
  export let servers: Server[] = [];
  export let currentServer: string = '';
  export let category: 'sub' | 'dub' | 'raw' = 'sub';
  export let changeServerManual: (name: string, category: 'sub' | 'dub' | 'raw') => void;
  
  // Dynamically determine available categories
  $: availableCategories = Array.from(
    new Set(servers.map(s => s.category))
  ) as Array<'sub' | 'dub' | 'raw'>;
  
  // Prioritize sub and dub, then raw
  $: sortedCategories = availableCategories.sort((a, b) => {
    const order = { 'sub': 0, 'dub': 1, 'raw': 2 };
    return (order[a] ?? 3) - (order[b] ?? 3);
  });
</script>

<div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
  {#each sortedCategories as cat}
    {#if servers.some(s => s.category === cat)}
      <div class="flex gap-2 items-center mb-1 md:mb-2">
        <span class="font-semibold text-orange-400 text-sm flex items-center gap-1">
          {#if cat === 'sub'}
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24">
              <rect x="24" y="56" width="208" height="144" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/>
              <path d="M112,155.72a32,32,0,1,1,0-55.44" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/>
              <path d="M192,155.72a32,32,0,1,1,0-55.44" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/>
            </svg>
            Sub:
          {:else if cat === 'dub'}
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
            Dub:
          {:else}
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
            Raw:
          {/if}
        </span>
        <div class="flex gap-2">
          {#each servers.filter(s => s.category === cat) as server}
            <button
              on:click={() => changeServerManual(server.serverName, cat)}
              class={`rounded-md bg-white/10 px-4 py-1.5 text-xs font-medium uppercase transition
                ${currentServer === server.serverName && category === cat
                  ? 'bg-orange-400 text-black'
                  : 'text-white hover:bg-orange-400 hover:text-black'}`}
              disabled={currentServer === server.serverName && category === cat}
            >
              {server.serverName}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/each}
</div>