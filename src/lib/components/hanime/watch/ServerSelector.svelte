<script lang="ts">
  // Accept any-shaped servers to support expanded per-mirror objects
  export let servers: any[] = [];
  export let currentServer: string = '';
  export let category: any = 'sub';
  export let changeServerManual: (name: string, category: any) => void = () => {};
  
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

<div class="server-selector-wrapper">
  <div class="desktop-horizontal-container">
    {#each sortedCategories as cat}
      {#if servers.some(s => s.category === cat)}
        <div class="category-row">
          <span class="category-label">
            {#if cat === 'sub'}
              <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24">
                <rect x="24" y="56" width="208" height="144" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/>
                <path d="M112,155.72a32,32,0,1,1,0-55.44" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/>
                <path d="M192,155.72a32,32,0,1,1,0-55.44" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/>
              </svg>
                <span class="label-text">Server:</span>
            {:else if cat === 'dub'}
              <svg class="icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
              <span class="label-text">Dub:</span>
            {:else}
              <svg class="icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
              </svg>
              <span class="label-text">Raw:</span>
            {/if}
          </span>
          <div class="server-buttons">
            {#each servers.filter(s => s.category === cat) as server}
              <button
                on:click={() => changeServerManual(server.serverName, cat)}
                class={`server-button ${currentServer === server.serverName && category === cat ? 'active' : ''}`}
                disabled={currentServer === server.serverName && category === cat}
              >
                {server.displayName ?? server.label ?? server.serverName}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .server-selector-wrapper {
    margin-bottom: 0.5rem;
  }

  .desktop-horizontal-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .category-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .category-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #fb923c;
    white-space: nowrap;
  }

  .label-text {
    display: inline;
  }

  .icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: #fb923c;
  }

  .server-buttons {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
    flex: 1;
    min-width: 0;
  }

  .server-button {
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    background-color: rgba(255, 255, 255, 0.1);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    transition: all 0.2s;
    text-align: center;
    color: white;
    border: 1px solid transparent;
    flex: 1;
    min-width: fit-content;
  }

  .server-button:not(.active):hover {
    background-color: #fb923c;
    color: black;
  }

  .server-button.active {
    background-color: #fb923c;
    color: black;
  }

  .server-button:disabled {
    cursor: not-allowed;
  }

  /* Mobile-specific optimizations */
  @media (max-width: 640px) {
    .server-selector-wrapper {
      margin-bottom: 0.125rem;
    }

    .desktop-horizontal-container {
      gap: 0.375rem;
    }

    .category-row {
      gap: 0.75rem;
    }

    .server-buttons {
      gap: 0.375rem;
      width: 100%;
    }

    .server-button {
      padding: 0.25rem 0.375rem;
      font-size: 0.7rem;
      min-width: 0;
      flex: 1 1 auto;
    }

    .icon {
      width: 0.875rem;
      height: 0.875rem;
    }

    .category-label {
      font-size: 0.7rem;
      min-width: 2.8rem;
    }
  }

  /* Tablet and desktop - single horizontal line layout */
  @media (min-width: 768px) {
    .server-selector-wrapper {
      margin-bottom: 0;
    }

    .desktop-horizontal-container {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 1rem;
      flex-wrap: nowrap;
    }

    .category-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: nowrap;
      flex-shrink: 0;
    }

    .category-label {
      flex-shrink: 0;
    }

    .label-text {
      display: inline;
    }

    .server-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: nowrap;
      width: auto;
      flex: none;
    }

    .server-button {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      flex: none;
      min-width: auto;
    }
  }
</style>