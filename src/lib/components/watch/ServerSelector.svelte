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
  const categories: Array<'sub' | 'dub'> = ['sub', 'dub'];
</script>

<div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
  {#each categories as cat}
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
          {:else}
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
            Dub:
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