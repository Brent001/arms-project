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

<!-- Mobile-optimized compact layout -->
<div class="player-selector-wrapper">
  <div class="player-selector-inner">
    <span class="player-label">
      <svg class="icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M5 3v18l15-9L5 3z"></path>
      </svg>
      <span class="label-text">Player:</span>
    </span>
    <div class="button-group">
      <button
        class={`player-button ${!useIframePlayer ? 'active' : ''}`}
        on:click={selectPlyr}
        disabled={!useIframePlayer}
      >
        <svg class="icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 15h8M8 12h8M8 9h8"></path>
        </svg>
        Plyr
      </button>
      <button
        on:click={selectIframePlayer}
        class={`player-button ${useIframePlayer ? 'active' : ''}`}
        disabled={useIframePlayer}
      >
        <svg class="icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="M8 12h8"></path>
        </svg>
        Iframe
      </button>
    </div>
  </div>
</div>

<style>
  .player-selector-wrapper {
    margin-bottom: 0.125rem;
  }

  .player-selector-inner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .player-label {
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
  }

  .button-group {
    display: flex;
    gap: 0.375rem;
    flex: 1;
    min-width: 0;
  }

  .player-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    font-weight: 700;
    font-size: 0.75rem;
    transition: all 0.2s;
    border: 1px solid transparent;
    flex: 1;
    min-width: 0;
    background-color: #374151;
    color: white;
  }

  .player-button:not(.active):hover {
    background-color: #fb923c;
    color: black;
    border-color: #fb923c;
  }

  .player-button.active {
    background-color: #fb923c;
    color: black;
  }

  .player-button:disabled {
    cursor: not-allowed;
  }

  /* Mobile-specific optimizations */
  @media (max-width: 640px) {
    .player-selector-wrapper {
      margin-bottom: 0.25rem;
    }

    .player-selector-inner {
      gap: 0.375rem;
    }

    .player-label {
      font-size: 0.7rem;
    }

    .player-button {
      padding: 0.25rem 0.375rem;
      font-size: 0.7rem;
      gap: 0.2rem;
    }

    .icon {
      width: 0.875rem;
      height: 0.875rem;
    }
  }

  /* Tablet and desktop - restore full layout */
  @media (min-width: 768px) {
    .player-selector-wrapper {
      margin-bottom: 0.25rem;
    }

    .player-selector-inner {
      gap: 0.5rem;
      flex-wrap: nowrap;
    }

    .label-text {
      display: inline;
    }

    .button-group {
      flex: none;
      width: auto;
    }

    .player-button {
      min-width: 72px;
      flex: none;
    }
  }
</style>