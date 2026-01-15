<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import CharacterModal from '$lib/components/CharacterModal.svelte';
  import CharacterVoiceActorRow from '$lib/components/CharacterVoiceActorRow.svelte';
  import SeasonCard from '$lib/components/SeasonCard.svelte';
  import Genre from '$lib/components/genre.svelte';
  import type { PageData } from './$types.js';
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import { browser } from '$app/environment';

  let imageLoadedStates: { [key: string]: boolean } = {};

  export let data: PageData & { pageLoadError?: string };

  let error: string | null = null;
  let retryAttempts = 0;
  const MAX_RETRY_ATTEMPTS = 3;

  $: anime = data?.anime || null;
  $: moreInfo = data?.moreInfo || null;
  $: recommended = Array.isArray(data?.recommendedAnimes) ? data.recommendedAnimes : [];
  $: related = Array.isArray(data?.relatedAnimes) ? data.relatedAnimes : [];
  $: seasons = Array.isArray(data?.seasons) ? data.seasons : [];
  // Derive processedSeasons with client-side `isCurrent` flag based on current anime id
  $: processedSeasons = (Array.isArray(seasons) ? seasons : []).map((s: any) => ({
    ...s,
    isCurrent: !!(s && s.id && anime && anime.id && String(s.id) === String(anime.id))
  }));
  $: genres = Array.isArray((data as any)?.genres) ? (data as any).genres : [];

  let firstEpisodeId: string | null = null;
  let sidebarTab: 'today' | 'week' | 'month' = 'today';
  let topAiringAnimes: any[] = [];
  let topUpcomingAnimes: any[] = [];
  let loading = true;
  let showCharacterModal = false;

  let initializedAnimeId: string | null = null;
  let loadingAbortController: AbortController | null = null;
  let mounted = false;

  function safeSetBodyOverflow(value: string) {
    if (browser && typeof document !== 'undefined' && document.body) {
      try {
        document.body.style.overflow = value;
      } catch (err) {
        console.warn('Failed to set body overflow:', err);
      }
    }
  }

  function logError(context: string, error: any) {
    console.error(`[${context}] Error:`, {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      timestamp: new Date().toISOString()
    });
  }

  async function safeFetch(url: string, options: RequestInit = {}, context: string = 'API'): Promise<Response | null> {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
      } catch (err) {
        lastError = err as Error;
        
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }
        
        if (err instanceof Error && err.message.includes('HTTP 4')) {
          throw err;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          logError(`${context} (Retry ${attempt + 1})`, err);
        }
      }
    }

    if (lastError) {
      logError(context, lastError);
      throw lastError;
    }
    
    return null;
  }

  function safeJsonParse(response: Response, context: string = 'JSON'): Promise<any> {
    return response.json().catch(err => {
      logError(`${context} Parse`, err);
      return { success: false, error: 'Invalid JSON response' };
    });
  }

  $: {
    const id = data?.anime?.id;
    if (id && typeof id === 'string' && id !== initializedAnimeId && mounted) {
      initializedAnimeId = id;
      (async () => {
        imageLoadedStates = {};
        loading = true;
        error = null;
        if (data.pageLoadError) {
          error = data.pageLoadError;
          loading = false;
          return;
        }

        loadingAbortController?.abort();
        loadingAbortController = new AbortController();
        
        try {
          await initializeData(loadingAbortController.signal);
        } catch (err) {
          if (!(err instanceof DOMException && err.name === 'AbortError')) {
            logError('Data initialization', err);
            error = err instanceof Error ? err.message : 'Failed to load data';
            retryAttempts++;
          }
        } finally {
          loading = false;
        }
      })();
    } else if (!id && mounted) {
      loading = false;
      error = data.pageLoadError || 'No anime ID provided or failed to load initial data.';
    }
  }

  async function handleAnimeClick(animeId: string) {
    if (!animeId || typeof animeId !== 'string' || loading) return;
    
    loading = true;
    error = null;
    
    try {
      await goto(`/info/${encodeURIComponent(animeId)}`);
    } catch (err) {
      logError('Navigation', err);
      error = 'Failed to navigate to anime page';
    } finally {
      loading = false;
    }
  }

  function handleImageLoad(id: string) {
    imageLoadedStates[id] = true;
  }

  async function initializeData(signal?: AbortSignal) {
    const animeId = data?.anime?.id;
    if (!animeId || typeof animeId !== 'string') {
      throw new Error('Invalid anime ID');
    }

    const [episodesResult, homeResult] = await Promise.allSettled([
      fetchEpisodes(animeId, signal),
      fetchHomeData(signal)
    ]);

    if (episodesResult.status === 'rejected') {
      logError('Episodes fetch', episodesResult.reason);
    }

    if (homeResult.status === 'rejected') {
      logError('Home data fetch', homeResult.reason);
    }
  }

  async function fetchEpisodes(animeId: string, signal?: AbortSignal) {
    if (!animeId || typeof animeId !== 'string') {
      throw new Error('Invalid anime ID for episodes');
    }

    firstEpisodeId = null;
    
    try {
      const encodedId = encodeURIComponent(animeId);
      const resp = await safeFetch(
        `/api/anime?action=episodes&animeId=${encodedId}`, 
        { signal }, 
        'Episodes'
      );
      
      if (!resp) throw new Error('No response from episodes API');
      
      const json = await safeJsonParse(resp, 'Episodes');
      
      if (json?.success && Array.isArray(json.data?.episodes) && json.data.episodes.length > 0) {
        const firstEpisode = json.data.episodes[0];
        if (firstEpisode?.episodeId && typeof firstEpisode.episodeId === 'string') {
          firstEpisodeId = firstEpisode.episodeId;
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        logError('Episodes fetch', err);
      }
    }
  }

  async function fetchHomeData(signal?: AbortSignal) {
    try {
      const resp = await safeFetch('/api/home', { signal }, 'Home');
      
      if (!resp) throw new Error('No response from home API');
      
      const json = await safeJsonParse(resp, 'Home');
      
      if (json?.success) {
        topAiringAnimes = Array.isArray(json.data?.topAiringAnimes) ? json.data.topAiringAnimes : [];
        topUpcomingAnimes = Array.isArray(json.data?.topUpcomingAnimes) ? json.data.topUpcomingAnimes : [];
      } else {
        topAiringAnimes = [];
        topUpcomingAnimes = [];
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        logError('Home data fetch', err);
        topAiringAnimes = [];
        topUpcomingAnimes = [];
      }
    }
  }

  function openCharacterModal() {
    showCharacterModal = true;
  }

  function closeCharacterModal() {
    showCharacterModal = false;
  }

  function handleModalBackdropClick(event: MouseEvent) {
    try {
      if (event?.target === event?.currentTarget) {
        closeCharacterModal();
      }
    } catch (err) {
      logError('Modal backdrop click', err);
      closeCharacterModal();
    }
  }

  function handleRetry() {
    if (retryAttempts < MAX_RETRY_ATTEMPTS) {
      error = null;
      initializedAnimeId = null;
      if (data?.anime?.id) {
        initializedAnimeId = data.anime.id;
      }
    }
  }

  $: {
    if (mounted) {
      safeSetBodyOverflow(showCharacterModal ? 'hidden' : '');
    }
  }

  onMount(() => {
    try {
      mounted = true;
      loading = true;
    } catch (err) {
      logError('Component mount', err);
    }
  });

  onDestroy(() => {
    try {
      loadingAbortController?.abort();
      safeSetBodyOverflow('');
    } catch (err) {
      logError('Component destroy', err);
    }
  });

  function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset.errorHandled) {
      img.dataset.errorHandled = 'true';
      img.onerror = null;
    }
  }

  function safeTruncate(str: string | undefined | null, maxLength: number = 100): string {
    if (!str || typeof str !== 'string') return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }

  function safeSlice<T>(arr: T[] | undefined | null, start: number = 0, end?: number): T[] {
    if (!Array.isArray(arr)) return [];
    try {
      return arr.slice(start, end);
    } catch {
      return [];
    }
  }

  type CharacterVoiceActor = {
    character: { poster: string; name: string; cast?: string };
    voiceActors: Array<{ poster: string; name: string; cast?: string }>;
  };

  let showFullDescription = false;
  let isLongDescription = false;
  let descriptionRef: HTMLDivElement | null = null;
  const DESCRIPTION_LIMIT = 450;
  let isMobile = false;

  let showAllGenres = false;
  let showAllStudios = false;
  let showAllProducers = false;

  $: allStudios =
    moreInfo?.studios
      ? (Array.isArray(moreInfo.studios)
          ? moreInfo.studios
          : moreInfo.studios.split(',').map((s: string) => s.trim())
        ).filter((s: string) => s)
      : [];
  $: displayedStudios = isMobile && !showAllStudios ? allStudios.slice(0, 3) : allStudios;

  $: allProducers =
    moreInfo?.producers
      ? (Array.isArray(moreInfo.producers)
          ? moreInfo.producers
          : moreInfo.producers.split(',').map((s: string) => s.trim())
        ).filter((s: string) => s)
      : [];
  $: displayedProducers = isMobile && !showAllProducers ? allProducers.slice(0, 3) : allProducers;

  $: groupedCharacters = (() => {
    const map = new Map<string, { character: any; voiceActors: any[] }>();
    if (anime?.charactersVoiceActors) {
      anime.charactersVoiceActors.forEach((cva: any) => {
        const key = cva.character.id;
        if (!map.has(key)) {
          map.set(key, { character: cva.character, voiceActors: [] });
        }
        map.get(key)!.voiceActors.push(cva.voiceActor);
      });
    }
    return Array.from(map.values());
  })();

  function updateIsMobile() {
    if (browser) {
      isMobile = window.innerWidth <= 768;
    }
  }

  onMount(() => {
    if (browser) {
      updateIsMobile();
      window.addEventListener('resize', updateIsMobile);
      if (anime?.description && anime.description.length > DESCRIPTION_LIMIT) {
        isLongDescription = true;
      }
    }
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('resize', updateIsMobile);
    }
  });
</script>

<svelte:head>
  <title>{anime?.name ? `${anime.name} | ARMS Anime` : 'Anime Info | ARMS Anime'}</title>
</svelte:head>

<Navbar />

<div class="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pt-16">
  {#if !mounted || loading}
    <div class="flex items-center justify-center flex-1">
      <img
        src="/assets/loader.gif"
        alt="Loading..."
        class="object-contain"
        style="max-width: 120px; max-height: 110px; aspect-ratio: 1 / 1;"
        on:error={handleImageError}
      />
    </div>
  {:else if error}
    <div class="flex items-center justify-center flex-1">
      <div class="text-center max-w-md mx-auto p-6">
        <h2 class="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
        <p class="text-gray-400 mb-6">{error}</p>
        {#if retryAttempts < MAX_RETRY_ATTEMPTS}
          <button
            on:click={handleRetry}
            class="bg-orange-400 hover:bg-orange-500 text-gray-900 font-bold px-6 py-2 rounded-lg transition"
          >
            Try Again ({retryAttempts + 1}/{MAX_RETRY_ATTEMPTS})
          </button>
        {:else}
          <div class="text-gray-500 text-sm">
            Maximum retry attempts reached. Please refresh the page or try again later.
          </div>
        {/if}
      </div>
    </div>
  {:else if !anime || !moreInfo}
    <div class="flex items-center justify-center flex-1">
      <div class="text-center">
        <h2 class="text-2xl font-bold text-red-400 mb-2">No anime information available</h2>
        <p class="text-gray-400">The requested anime could not be found or loaded.</p>
      </div>
    </div>
  {:else}
    <div class="flex-1 w-full">
      <div class="max-w-[125rem] mx-auto flex flex-col gap-6 sm:gap-10 px-2 sm:px-4">
        <div class="flex flex-col xl:flex-row gap-2 sm:gap-4 w-full">
          <!-- Main content -->
          <div class="flex-1 flex flex-col gap-6 sm:gap-10">
            <!-- Main Info Card -->
            <section class="flex-1 flex flex-col gap-8 mb-5">
              <div class="flex flex-col md:flex-row gap-4 md:gap-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg shadow-2xl p-6 md:p-10">
                <!-- Poster -->
                <div class="flex flex-col items-center md:items-start flex-shrink-0 mx-auto md:mx-0">
                  <div class="relative w-64 aspect-[3/4] rounded-lg border-4 border-gray-800 overflow-hidden bg-gray-800">
                    {#if !imageLoadedStates[`main-${anime.id}`]}
                      <div class="skeleton-loader absolute inset-0"></div>
                    {/if}
                    <img
                      src={anime.poster}
                      alt={safeTruncate(anime.name, 50)}
                      class="shadow-2xl w-full h-full object-cover {imageLoadedStates[`main-${anime.id}`] ? 'opacity-100' : 'opacity-0'}"
                      on:error={handleImageError}
                      on:load={() => handleImageLoad(`main-${anime.id}`)}
                    />
                  </div>
                </div>
                <!-- Details -->
                <div class="flex-1 space-y-3">
                  <div class="flex items-center gap-2 sm:gap-3 md:ml-0 ml-[-8px]">
                    <h1 class="text-xl sm:text-3xl font-bold text-orange-400 
                      {isMobile ? 'w-full text-center' : ''}">
                    {anime.name || 'Unknown Anime'}
                    </h1>
                  </div>

                  <!-- Anime Stats -->
                  {#if anime.stats}
                    <div class="flex flex-wrap items-center gap-3 text-sm text-gray-300 md:ml-0 ml-[-8px] {isMobile ? 'justify-center' : ''}">
                      <div class="flex items-center gap-1">
                        {#if anime.stats.rating}
                          <span class="bg-white text-gray-900 px-2 py-0.5 rounded text-xs font-bold">{anime.stats.rating}</span>
                        {/if}
                        {#if anime.stats.quality}
                          <span style="background-color: #ff7693;" class="text-white px-2 py-0.5 rounded text-xs font-bold">{anime.stats.quality}</span>
                        {/if}
                      </div>

                      <div class="flex items-center gap-1.5 text-xs font-semibold">
                        {#if anime.stats.type}
                          <span>•</span>
                          <span>{anime.stats.type}</span>
                        {/if}
                        
                        {#if anime.stats.duration}
                          {#if anime.stats.type}
                            <span>•</span>
                          {/if}
                          <span>{anime.stats.duration}</span>
                        {/if}
                      </div>
                    </div>
                  {/if}
                  
                  <div class="space-y-3">
                    <!-- Mobile Watch Button -->
                    {#if isMobile}
                      <div class="flex justify-center py-2">
                        {#if firstEpisodeId !== null}
                          <a
                            href={`/watch/${encodeURIComponent(firstEpisodeId)}`}
                            class="inline-flex items-center justify-center gap-2 bg-orange-400 hover:bg-orange-500 text-gray-900 font-bold px-12 py-2 rounded-lg shadow transition text-sm"
                          >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                              <polygon points="10,8 16,12 10,16" fill="currentColor"/>
                            </svg>
                            Watch
                          </a>
                        {:else}
                          <button
                            class="inline-flex items-center justify-center gap-2 bg-gray-700 text-gray-400 font-bold px-12 py-2 rounded-lg shadow transition text-sm cursor-not-allowed opacity-60"
                            disabled
                            aria-disabled="true"
                          >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                              <polygon points="10,8 16,12 10,16" fill="currentColor"/>
                            </svg>
                            Watch
                          </button>
                        {/if}
                      </div>
                    {/if}

                    <!-- Genres -->
                    {#if moreInfo.genres && moreInfo.genres.length > 0}
                      <div class="flex flex-wrap items-center gap-1.5 md:ml-0 ml-[-8px]">
                        {#each (isMobile && !showAllGenres ? moreInfo.genres.slice(0, 3) : moreInfo.genres) as genre}
                          <a
                            href={`/genre/${encodeURIComponent(genre.toLowerCase())}`}
                            class="bg-gray-800 text-orange-300 px-2 py-1 rounded text-xs font-medium hover:bg-gray-700 transition"
                          >
                            {genre}
                          </a>
                        {/each}
                        {#if isMobile && moreInfo.genres.length > 3}
                          <button
                            class="text-orange-300 hover:text-orange-400 text-xs font-semibold"
                            on:click={() => (showAllGenres = !showAllGenres)}
                            style="background: none; border: none; cursor: pointer; padding: 0;"
                          >
                            {showAllGenres ? '- Less' : `+${moreInfo.genres.length - 3} More`}
                          </button>
                        {/if}
                      </div>
                    {/if}

                    <!-- Studios -->
                    {#if allStudios.length > 0}
                      <div class="text-sm flex flex-wrap items-center gap-2 md:ml-0 ml-[-8px]">
                        <span class="text-orange-300 font-medium">Studio{allStudios.length > 1 ? 's' : ''}:</span>
                        {#each displayedStudios as studio, i}
                          <span
                            role="link"
                            tabindex="0"
                            class="cursor-pointer hover:underline hover:text-orange-400 transition text-xs"
                            on:click={() => goto(`/producer/${encodeURIComponent(studio.replace(/\./g, '').replace(/\s+/g, '-').toLowerCase())}`)}
                            on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') goto(`/producer/${encodeURIComponent(studio.replace(/\./g, '').replace(/\s+/g, '-').toLowerCase())}`); }}
                          >
                            {studio}{i < displayedStudios.length - 1 ? ',' : ''}
                          </span>
                        {/each}
                        {#if isMobile && allStudios.length > 3}
                          <button
                            class="text-orange-300 hover:text-orange-400 text-xs font-semibold"
                            on:click={() => (showAllStudios = !showAllStudios)}
                            style="background: none; border: none; cursor: pointer; padding: 0; margin-left: 4px;"
                          >
                            {showAllStudios ? '- Less' : `+${allStudios.length - 3} More`}
                          </button>
                        {/if}
                      </div>
                    {/if}

                    <!-- Producers -->
                    {#if allProducers.length > 0}
                      <div class="text-sm flex flex-wrap items-center gap-2 md:ml-0 ml-[-8px]">
                        <span class="text-orange-300 font-medium">Producer{allProducers.length > 1 ? 's' : ''}:</span>
                        {#each displayedProducers as producer, i}
                          <span
                            role="link"
                            tabindex="0"
                            class="cursor-pointer hover:underline hover:text-orange-400 transition text-xs"
                            on:click={() => goto(`/producer/${encodeURIComponent(producer.replace(/\./g, '').replace(/\s+/g, '-').toLowerCase())}`)}
                            on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') goto(`/producer/${encodeURIComponent(producer.replace(/\./g, '').replace(/\s+/g, '-').toLowerCase())}`); }}
                          >
                            {producer}{i < displayedProducers.length - 1 ? ',' : ''}
                          </span>
                        {/each}
                        {#if isMobile && allProducers.length > 3}
                          <button
                            class="text-orange-300 hover:text-orange-400 text-xs font-semibold"
                            on:click={() => (showAllProducers = !showAllProducers)}
                            style="background: none; border: none; cursor: pointer; padding: 0; margin-left: 4px;"
                          >
                            {showAllProducers ? '- Less' : `+${allProducers.length - 3} More`}
                          </button>
                        {/if}
                      </div>
                    {/if}

                    <!-- Description -->
                    <span class="text-orange-300 font-semibold block mb-1 md:ml-0 ml-[-8px]">Overview:</span>
                    {#if isMobile}
                      <div
                        class="text-gray-200 text-sm leading-tight md:ml-0 ml-[-8px]"
                        style="max-height: 220px; overflow-y: auto; line-height: 1.4;"
                      >
                        {anime.description || 'No description available.'}
                      </div>
                    {:else if isLongDescription && !showFullDescription}
                      <div
                        class="text-gray-200 text-sm leading-tight md:ml-0 ml-[-8px]"
                        style="line-height: 1.4; position: relative;"
                      >
                        <span>
                          {anime.description?.slice(0, DESCRIPTION_LIMIT) || 'No description available.'}...
                        </span>
                        <button
                          class="text-orange-300 hover:text-orange-400 text-xs font-semibold mt-1"
                          on:click={() => showFullDescription = true}
                          style="background: none; border: none; cursor: pointer; padding: 0; margin: 0;"
                        >
                          + More
                        </button>
                      </div>
                    {:else if isLongDescription && showFullDescription}
                      <div
                        class="text-gray-200 text-sm leading-tight md:ml-0 ml-[-8px]"
                        style="line-height: 1.4;"
                      >
                        <span>
                          {anime.description}
                        </span>
                        <button
                          class="text-orange-300 hover:text-orange-400 text-xs font-semibold mt-1"
                          on:click={() => showFullDescription = false}
                          style="background: none; border: none; cursor: pointer; padding: 0; margin: 0;"
                        >
                          - Less
                        </button>
                      </div>
                    {:else}
                      <div
                        class="text-gray-200 text-sm leading-tight md:ml-0 ml-[-8px]"
                        style="line-height: 1.4;"
                      >
                        {anime.description || 'No description available.'}
                      </div>
                    {/if}

                    <!-- Watch Button -->
                    {#if !isMobile}
                      {#if firstEpisodeId !== null}
                        <a
                          href={`/watch/${encodeURIComponent(firstEpisodeId)}`}
                          class="inline-flex items-center gap-2 bg-orange-400 hover:bg-orange-500 text-gray-900 font-bold px-5 py-2 rounded-lg shadow transition text-sm md:ml-0 ml-[-8px]"
                          style="margin-bottom: 0.5rem;"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                            <polygon points="10,8 16,12 10,16" fill="currentColor"/>
                          </svg>
                          Watch
                        </a>
                      {:else}
                        <button
                          class="inline-flex items-center gap-2 bg-gray-700 text-gray-400 font-bold px-5 py-2 rounded-lg shadow transition text-sm cursor-not-allowed opacity-60 md:ml-0 ml-[-8px]"
                          style="margin-bottom: 0.5rem;"
                          disabled
                          aria-disabled="true"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                            <polygon points="10,8 16,12 10,16" fill="currentColor"/>
                          </svg>
                          Watch
                        </button>
                      {/if}
                    {/if}
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
                      <div class="bg-gray-800 p-2 rounded">
                        <span class="text-orange-300 font-medium">Episodes:</span>
                        <div class="text-white">{anime.stats?.episodes?.sub || 0} Sub / {anime.stats?.episodes?.dub || 0} Dub</div>
                      </div>
                      <div class="bg-gray-800 p-2 rounded">
                        <span class="text-orange-300 font-medium">Status:</span>
                        <div class="text-white">{moreInfo.status}</div>
                      </div>
                      <div class="bg-gray-800 p-2 rounded col-span-2 sm:col-span-1">
                        <span class="text-orange-300 font-medium">Aired:</span>
                        <div class="text-white">{moreInfo.aired}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- More Seasons -->
              {#if processedSeasons.length > 1}
                <section class="mb-6">
                  <h2 class="text-lg sm:text-xl font-bold text-orange-400 mb-4">More Seasons</h2>
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {#each processedSeasons.filter(s => s && s.id && (s.title || s.name)) as season}
                      <SeasonCard {season} {imageLoadedStates} onImageLoad={handleImageLoad} />
                    {/each}
                  </div>
                </section>
              {/if}

              <!-- Characters & Voice Actors -->
              {#if groupedCharacters.length > 0}
                <section class="mb-4">
                  <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-orange-400">Characters & Voice Actors</h2>
                    {#if groupedCharacters.length > 6}
                      <button
                        on:click={openCharacterModal}
                        class="text-orange-300 hover:text-orange-400 text-sm font-semibold transition-colors flex items-center gap-1"
                      >
                        View more
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    {/if}
                  </div>
                  <CharacterVoiceActorRow {groupedCharacters} />
                </section>
              {/if}

              <!-- Recommended Anime -->
              {#if recommended.length > 0}
                <section class="mb-6">
                  <h2 class="text-2xl font-bold text-orange-400 mb-4">Recommended Anime</h2>
                  <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {#each recommended.filter(rec => rec && rec.id && rec.name) as rec}
                      <a 
                        href={`/info/${encodeURIComponent(rec.id)}`} 
                        on:click|preventDefault={() => handleAnimeClick(rec.id)}
                        class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03]"
                        style="min-height: 120px;"
                      >
                        <div class="relative aspect-[3/4]">
                          {#if !imageLoadedStates[`rec-${rec.id}`]}
                            <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                          {/if}
                          <img 
                            src={rec.poster} 
                            alt={safeTruncate(rec.name, 50)} 
                            class="w-full h-full object-cover {imageLoadedStates[`rec-${rec.id}`] ? 'opacity-100' : 'opacity-0'}" 
                            loading="lazy"
                            on:error={handleImageError}
                            on:load={() => handleImageLoad(`rec-${rec.id}`)}
                          />
                          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        </div>
                        <div class="absolute bottom-0 left-0 right-0 p-2">
                          <h3 class="font-semibold text-white text-xs mb-1 line-clamp-2 group-hover:text-orange-200 transition-colors" title={rec.name}>
                            {safeTruncate(rec.name, 60)}
                          </h3>
                          <div class="flex flex-wrap gap-1">
                            <span class="bg-orange-400 text-gray-900 px-2 py-0.5 rounded text-[10px] font-bold">
                              {rec.type || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </a>
                    {/each}
                  </div>
                </section>
              {/if}

              <!-- Related Anime -->
              {#if related.length > 0}
                <section>
                  <h2 class="text-2xl font-bold text-orange-400 mb-4">Related Anime</h2>
                  <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {#each related.filter(rel => rel && rel.id && rel.name) as rel}
                      <a 
                        href={`/info/${encodeURIComponent(rel.id)}`}
                        on:click|preventDefault={() => handleAnimeClick(rel.id)}
                        class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03]"
                      >
                        <div class="relative aspect-[3/4]">
                          {#if !imageLoadedStates[`rel-${rel.id}`]}
                            <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                          {/if}
                          <img 
                            src={rel.poster} 
                            alt={safeTruncate(rel.name, 50)} 
                            class="w-full h-full object-cover {imageLoadedStates[`rel-${rel.id}`] ? 'opacity-100' : 'opacity-0'}" 
                            loading="lazy"
                            on:error={handleImageError}
                            on:load={() => handleImageLoad(`rel-${rel.id}`)}
                          />
                          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        </div>
                        <div class="absolute bottom-0 left-0 right-0 p-2">
                          <h3 class="font-semibold text-white text-[11px] mb-0.5 line-clamp-2 group-hover:text-orange-200 transition-colors" title={rel.name}>
                            {safeTruncate(rel.name, 60)}
                          </h3>
                          <div class="flex flex-wrap gap-0.5">
                            <span class="bg-orange-400 text-gray-900 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {rel.type || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </a>
                    {/each}
                  </div>
                </section>
              {/if}
            </section>
          </div>

          <!-- Sidebar with Genre Component -->
          <div class="flex flex-col gap-2">
            <Sidebar
              sidebarTab={sidebarTab}
              setSidebarTab={(tab) => sidebarTab = tab}
              top10Today={data?.top10Animes?.today ?? []}
              top10Week={data?.top10Animes?.week ?? []}
              top10Month={data?.top10Animes?.month ?? []}
            />
            <!-- Genre Component - Desktop Only -->
            <div class="hidden xl:block">
              <Genre data={genres} />
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <Footer />
</div>

<!-- Character Modal -->
{#if showCharacterModal}
  <CharacterModal
    handleBackdrop={handleModalBackdropClick}
    charactersVoiceActors={anime?.charactersVoiceActors || []}
    onClose={closeCharacterModal}
    animeId={anime?.id || ''}
  />
{/if}

<style>
  @media (max-width: 768px) {
    .flex-shrink-0 {
      margin-left: auto;
      margin-right: auto;
    }
  }

  .skeleton-loader {
    background-color: #374151;
  }

  img {
    transition: opacity 0.3s ease-in-out;
  }
</style>