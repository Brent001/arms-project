<!-- AnimeCard.svelte -->
<script lang="ts">
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';

  export let anime: any;
  export let showRank: boolean = false;
  export let showEpisodes: boolean = false;
  export let showDescription: boolean = false;
  export const description: string = '';
  export const genres: string[] = [];
  export const duration: string = '';
  export const type: string = '';

  let showTooltip = false;
  let tooltipShowDelayTimeout: ReturnType<typeof setTimeout> | undefined; // For delaying tooltip appearance
  let tooltipHideDelayTimeout: ReturnType<typeof setTimeout> | undefined; // For delaying tooltip disappearance
  let isMobile = false;

  // Skeleton loading for poster
  let imageLoadedStates: { [key: string]: boolean } = {};

  // Tooltip data stores
  const qtip = writable<any>(null);
  const qtipLoading = writable(false);
  const qtipError = writable<string | null>(null);

  // Reset image loaded states when anime changes
  $: if (anime) {
    imageLoadedStates = {};
  }

  function handleImageLoad(id: string) {
    imageLoadedStates[id] = true;
  }

  function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset.errorHandled) {
      img.dataset.errorHandled = 'true';
      img.onerror = null; // Prevent infinite loop
    }
  }

  // Mobile detection
  onMount(() => {
    const checkMobile = () => {
      isMobile = window.innerWidth < 768; // Tailwind's md breakpoint
      if (isMobile) {
        // If it becomes mobile, ensure tooltip is hidden and timers cleared
        showTooltip = false;
        clearTimeout(tooltipShowDelayTimeout);
        clearTimeout(tooltipHideDelayTimeout);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(tooltipShowDelayTimeout);
      clearTimeout(tooltipHideDelayTimeout);
    };
  });

  async function fetchQtip(id: string) {
    qtipLoading.set(true);
    qtipError.set(null);
    try {
      const res = await fetch(`/api/qtip?id=${id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // The anime info is now in data.data.anime
      if (data.success && data.data && data.data.anime) {
        qtip.set(data.data.anime);
      } else {
        throw new Error('No anime info');
      }
    } catch (e) {
      qtipError.set('Failed to load info.');
      qtip.set(null);
    } finally {
      qtipLoading.set(false);
    }
  }

  const TOOLTIP_SHOW_DELAY = 300; // ms to wait before showing tooltip
  const TOOLTIP_HIDE_DELAY = 100; // ms to wait before hiding tooltip

  function handleMouseEnterCard() {
    if (!showDescription || !anime.id || isMobile) return;
    clearTimeout(tooltipHideDelayTimeout); // Cancel any pending hide of the tooltip
    if (!showTooltip) { // Only show if not already showing
      tooltipShowDelayTimeout = setTimeout(() => {
        showTooltip = true;
        fetchQtip(anime.id);
      }, TOOLTIP_SHOW_DELAY);
    }
  }

  function handleMouseLeaveCard() {
    if (!showDescription || !anime.id || isMobile) return;
    clearTimeout(tooltipShowDelayTimeout); // Cancel any pending show
    tooltipHideDelayTimeout = setTimeout(() => {
      showTooltip = false;
    }, TOOLTIP_HIDE_DELAY);
  }

  function handleMouseEnterTooltip() {
    if (!showDescription || !anime.id || isMobile) return;
    clearTimeout(tooltipHideDelayTimeout); // If mouse enters the tooltip, cancel any pending hide
  }

  function handleMouseLeaveTooltip() {
    if (!showDescription || !anime.id || isMobile) return;
    tooltipHideDelayTimeout = setTimeout(() => {
      showTooltip = false;
    }, TOOLTIP_HIDE_DELAY);
  }
</script>

<div class="relative">
  <a
    href={`/info/${anime.id}`}
    class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-all duration-150 border border-transparent hover:border-orange-400/40 cursor-pointer block hover:scale-[1.03]"
    on:mouseenter={handleMouseEnterCard}
    on:mouseleave={handleMouseLeaveCard}
  >
    <div class="relative aspect-[3/4]">
      {#if !imageLoadedStates[anime.id]}
        <div class="skeleton-loader w-full h-full absolute inset-0"></div>
      {/if}
      <img
        src={anime.poster}
        alt={anime.name}
        class="w-full h-full object-cover {imageLoadedStates[anime.id] ? 'opacity-100' : 'opacity-0'}"
        loading="lazy"
        on:load={() => handleImageLoad(anime.id)}
        on:error={handleImageError}
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
      
      <!-- Rank badge -->
      {#if showRank}
        <div class="absolute top-2 left-2">
          <span class="bg-orange-400 text-gray-900 px-2 py-0.5 rounded text-[10px] font-semibold shadow">
            #{anime.rank}
          </span>
        </div>
      {/if}
      
      <!-- Episodes info -->
      {#if showEpisodes}
        <span class="absolute top-2 left-2 bg-gray-900/80 text-orange-300 px-2 py-0.5 rounded text-[10px] shadow">
          {anime.episodes?.sub ?? 0} Sub / {anime.episodes?.dub ?? 0} Dub
        </span>
      {/if}
    </div>
    
    <div class="absolute bottom-0 left-0 right-0 p-2">
      <h3 class="font-semibold text-white text-xs mb-1 line-clamp-2 group-hover:text-orange-200 transition-colors" title={anime.name}>
        {anime.name}
      </h3>
    </div>
  </a>
  
  <!-- Tooltip for description - Hidden on mobile -->
  {#if showDescription && showTooltip && anime.id && !isMobile}
    <div 
      class="absolute z-50 bg-gray-800/90 backdrop-blur-[10px] border border-gray-700 rounded-xl p-4 shadow-2xl max-w-xs top-0 left-full ml-2 pointer-events-auto w-[320px] flex flex-col gap-y-2"
      on:mouseenter={handleMouseEnterTooltip}
      on:mouseleave={handleMouseLeaveTooltip}
    >
      {#if $qtipLoading}
        <div class="flex justify-center items-center h-20">
          <div class="loading-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
      {:else if $qtipError}
        <div class="text-orange-400 text-xs">{$qtipError}</div>
      {:else if $qtip}
        <h1 class="text-lg font-bold text-orange-400 leading-6 mb-1">{$qtip.name}</h1>
        <div class="w-full flex items-center relative mt-1 mb-2 gap-2">
          {#if $qtip.malscore}
            <div class="flex items-center gap-1 bg-gray-900 px-2 py-0.5 rounded text-orange-300 text-xs font-semibold">
              <span>★</span>
              <span>{$qtip.malscore}</span>
            </div>
          {/if}
          {#if $qtip.quality}
            <div class="bg-orange-400 text-gray-900 px-2 py-0.5 rounded text-xs font-bold">{$qtip.quality}</div>
          {/if}
          {#if $qtip.type}
            <div class="bg-gray-700 text-orange-200 px-2 py-0.5 rounded text-xs font-semibold">{$qtip.type}</div>
          {/if}
          {#if $qtip.episodes?.sub || $qtip.episodes?.dub}
            <div class="flex gap-1 ml-auto">
              {#if $qtip.episodes?.sub}
                <span class="bg-orange-300 text-gray-900 px-2 py-0.5 rounded text-xs font-semibold">Sub: {$qtip.episodes.sub}</span>
              {/if}
              {#if $qtip.episodes?.dub}
                <span class="bg-orange-200 text-gray-900 px-2 py-0.5 rounded text-xs font-semibold">Dub: {$qtip.episodes.dub}</span>
              {/if}
            </div>
          {/if}
        </div>
        {#if $qtip.description}
          <p class="text-gray-200 text-xs leading-5 font-light line-clamp-3 mb-2">{$qtip.description}</p>
        {/if}
        <div class="flex flex-col gap-1 text-xs">
          {#if $qtip.jname}
            <div><span class="text-gray-400">Japanese:</span> <span class="text-gray-200">{$qtip.jname}</span></div>
          {/if}
          {#if $qtip.synonyms}
            <div><span class="text-gray-400">Synonyms:</span> <span class="text-gray-200">{$qtip.synonyms}</span></div>
          {/if}
          {#if $qtip.aired}
            <div><span class="text-gray-400">Aired:</span> <span class="text-gray-200">{$qtip.aired}</span></div>
          {/if}
          {#if $qtip.status}
            <div><span class="text-gray-400">Status:</span> <span class="text-gray-200">{$qtip.status}</span></div>
          {/if}
          {#if $qtip.genres}
            <div class="flex flex-wrap">
              <span class="text-gray-400 mr-1">Genres:</span>
              {#each $qtip.genres as genre, i}
                <a href={`/genre/${genre}`} class="text-orange-300 hover:text-orange-400">
                  {genre}{i < $qtip.genres.length - 1 ? ',' : ''}
                </a>&nbsp;
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  
  .loading-dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f97316;
    animation: bounce 1.4s infinite ease-in-out both;
  }
  
  .dot:nth-child(1) {
    animation-delay: -0.32s;
  }
  
  .dot:nth-child(2) {
    animation-delay: -0.16s;
  }
  
  .dot:nth-child(3) {
    animation-delay: 0s;
  }
  
  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Skeleton Loader - plain background for performance */
  .skeleton-loader {
    background-color: #374151; /* gray-700 */
  }

  img {
    transition: opacity 0.3s ease-in-out;
  }
</style>