<script lang="ts">
  import { onMount } from 'svelte';

  export let useIframePlayer: boolean = false;
  export let setUseIframePlayer: (v: boolean) => void;
  export let animeId: string = '';
  export let serverName: string = '';

  function getPlayerKey() {
    return animeId && serverName ? `lastPlayer:${animeId}:${serverName}` : 'lastPlayer';
  }

  // Use iframe as default, but check per-anime+server
  onMount(() => {
    const key = getPlayerKey();
    const lastPlayer = localStorage.getItem(key);
    if (lastPlayer === 'plyr') {
      setUseIframePlayer(false);
    } else if (lastPlayer === 'iframe') {
      setUseIframePlayer(true);
    } else {
      // Default to Iframe
      setUseIframePlayer(true);
    }
  });

  $: {
    // When serverName or animeId changes, update player from storage
    const key = getPlayerKey();
    const lastPlayer = localStorage.getItem(key);
    if (lastPlayer === 'plyr') {
      setUseIframePlayer(false);
    } else if (lastPlayer === 'iframe') {
      setUseIframePlayer(true);
    }
  }

  function selectPlyr() {
    setUseIframePlayer(false);
    localStorage.setItem(getPlayerKey(), 'plyr');
  }

  function selectIframePlayer() {
    setUseIframePlayer(true);
    localStorage.setItem(getPlayerKey(), 'iframe');
  }
</script>

<div class="flex items-center gap-2 mb-3 flex-nowrap overflow-x-auto whitespace-nowrap">
  <span class="font-semibold text-orange-400 text-sm flex items-center gap-1">
    <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path d="M5 3v18l15-9L5 3z"></path>
    </svg>
    <span class="player-label">Player:</span>
  </span>
  <button
    class={`flex items-center gap-1 px-2 py-1 rounded font-bold text-xs transition min-w-[56px] border border-transparent ${!useIframePlayer ? 'bg-orange-400 text-black' : 'bg-gray-700 text-white hover:bg-orange-400 hover:text-black hover:border-orange-400'}`}
    on:click={selectPlyr}
    disabled={!useIframePlayer}
    style="justify-content:center; width: auto;"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M8 15h8M8 12h8M8 9h8"></path>
    </svg>
    Plyr
  </button>
  <button
    on:click={selectIframePlayer}
    class={`flex items-center gap-1 px-2 py-1 rounded font-bold text-xs transition min-w-[56px] border border-transparent ${useIframePlayer ? 'bg-orange-400 text-black' : 'bg-gray-700 text-white hover:bg-orange-400 hover:text-black hover:border-orange-400'}`}
    disabled={useIframePlayer}
    style="justify-content:center; width: auto;"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M8 12h8"></path>
    </svg>
    Iframe
  </button>
</div>

<style>

</style>