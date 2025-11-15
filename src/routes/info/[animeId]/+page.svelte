<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import CharacterVoiceActorRow from '$lib/components/CharacterVoiceActorRow.svelte';
  import CharacterModal from '$lib/components/CharacterModal.svelte';
  import type { PageData } from './$types.js'; // This type needs to reflect pageLoadError
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import { browser } from '$app/environment';

  // Extend PageData to include the optional pageLoadError
  export let data: PageData & { pageLoadError?: string };

  // Error handling state
  let error: string | null = null;
  let retryAttempts = 0;
  const MAX_RETRY_ATTEMPTS = 3;

  // Defensive reactive assignments with fallbacks - UPDATED for new structure
  $: anime = data?.anime || null;
  $: moreInfo = data?.moreInfo || null;
  $: recommended = Array.isArray(data?.recommendedAnimes) ? data.recommendedAnimes : [];
  $: related = Array.isArray(data?.relatedAnimes) ? data.relatedAnimes : [];
  $: seasons = Array.isArray(data?.seasons) ? data.seasons : [];

  let firstEpisodeId: string | null = null;
  let sidebarTab: 'today' | 'week' | 'month' = 'today';
  let topAiringAnimes: any[] = [];
  let topUpcomingAnimes: any[] = [];
  let loading = true;
  let showCharacterModal = false;

  let initializedAnimeId: string | null = null;
  let loadingAbortController: AbortController | null = null;
  let mounted = false;

  // Safe DOM manipulation check
  function safeSetBodyOverflow(value: string) {
    if (browser && typeof document !== 'undefined' && document.body) {
      try {
        document.body.style.overflow = value;
      } catch (err) {
        console.warn('Failed to set body overflow:', err);
      }
    }
  }

  // Enhanced error logging
  function logError(context: string, error: any) {
    console.error(`[${context}] Error:`, {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      timestamp: new Date().toISOString()
    });
  }

  // Robust API fetch with retry logic
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
        
        // Don't retry on AbortError or certain HTTP errors
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }
        
        if (err instanceof Error && err.message.includes('HTTP 4')) {
          // Don't retry client errors (4xx)
          throw err;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
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

  // Safe JSON parsing
  function safeJsonParse(response: Response, context: string = 'JSON'): Promise<any> {
    return response.json().catch(err => {
      logError(`${context} Parse`, err);
      return { success: false, error: 'Invalid JSON response' };
    });
  }

  // Handle anime data initialization with comprehensive error handling - UPDATED
  $: {
    const id = data?.anime?.id;
    if (id && typeof id === 'string' && id !== initializedAnimeId && mounted) {
      initializedAnimeId = id;
      (async () => {
        loading = true;
        error = null; // Clear previous errors
        if (data.pageLoadError) { // If pageLoad function already reported a critical error
          error = data.pageLoadError;
          loading = false;
          return; // Don't proceed with client-side initialization if server-side already failed critically
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
      error = data.pageLoadError || 'No anime ID provided or failed to load initial data.'; // Use pageLoadError if available
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

  async function initializeData(signal?: AbortSignal) {
    const animeId = data?.anime?.id;
    if (!animeId || typeof animeId !== 'string') {
      throw new Error('Invalid anime ID');
    }

    // Run both operations concurrently but handle errors independently
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
        // Don't throw - episodes are not critical for page display
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
        // Don't throw - sidebar data is not critical
      }
    }
  }

  function openCharacterModal() {
    if (anime?.charactersVoiceActors && Array.isArray(anime.charactersVoiceActors)) {
      showCharacterModal = true;
    }
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
      closeCharacterModal(); // Fallback
    }
  }

  function handleRetry() {
    if (retryAttempts < MAX_RETRY_ATTEMPTS) {
      error = null;
      initializedAnimeId = null; // Force re-initialization
      // Trigger reactive statement
      if (data?.anime?.id) {
        initializedAnimeId = data.anime.id;
      }
    }
  }

  // Safe body overflow management
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

  // Safe image error handling
  function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset.errorHandled) {
      img.dataset.errorHandled = 'true';
      img.src = '/assets/placeholder-anime.jpg'; // Fallback image
      img.onerror = null; // Prevent infinite loop
    }
  }

  // Safe string truncation
  function safeTruncate(str: string | undefined | null, maxLength: number = 100): string {
    if (!str || typeof str !== 'string') return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }

  // Safe array access
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
    voiceActor: { poster: string; name: string; cast?: string };
  };

  // Add these new variables for description expand/collapse
  let showFullDescription = false;
  let isLongDescription = false;
  let descriptionRef: HTMLDivElement | null = null;
  const DESCRIPTION_LIMIT = 450; // character limit for desktop
  let isMobile = false;

  // Add these new variables for genre/studio/producer expand/collapse
  let showAllGenres = false;
  let showAllStudios = false;
  let showAllProducers = false;

  // Derived variables for studios and producers for cleaner logic
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
      <!-- Use this for both loading screens -->
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
              <div class="flex flex-col md:flex-row gap-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg shadow-2xl p-6 md:p-10">
                <!-- Poster -->
                <div class="flex flex-col items-center md:items-start flex-shrink-0 mx-auto md:mx-0">
                  <img
                    src={anime.poster || '/assets/placeholder-anime.jpg'}
                    alt={safeTruncate(anime.name, 50)}
                    class="rounded-lg shadow-2xl w-64 h-auto object-cover border-4 border-gray-800"
                    on:error={handleImageError}
                  />
                </div>
                <!-- Details -->
                <div class="flex-1 space-y-3">
                  <!-- Move type and rating to the top, then title below -->

                  <div class="flex items-center gap-2 sm:gap-3 md:ml-0 ml-[-8px]">
                    <h1 class="text-xl sm:text-3xl font-bold text-orange-400 
                      {isMobile ? 'w-full text-center' : ''}">
                    {anime.name || 'Unknown Anime'}
                    </h1>
                  </div>

                  <!-- Anime Stats -->
                  {#if anime.stats}
                    <div class="flex flex-wrap items-center gap-3 text-sm text-gray-300 md:ml-0 ml-[-8px] {isMobile ? 'justify-center' : ''}">
                      <!-- Badges Group -->
                      <div class="flex items-center gap-1">
                        {#if anime.stats.rating}
                          <span class="bg-white text-gray-900 px-2 py-0.5 rounded text-xs font-bold">{anime.stats.rating}</span>
                        {/if}
                        {#if anime.stats.quality}
                          <span style="background-color: #ff7693;" class="text-white px-2 py-0.5 rounded text-xs font-bold">{anime.stats.quality}</span>
                        {/if}
                      </div>

                      <!-- Type & Duration Group -->
                      <div class="flex items-center gap-1.5 text-xs font-semibold">
                        {#if anime.stats.type}
                          <span>•</span>
                          <span>{anime.stats.type}</span>
                        {/if}
                        
                        {#if anime.stats.duration}
                          <!-- The dot will only appear if type also exists. -->
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
                            <!-- Watch Icon SVG -->
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

                    <!-- Genres at the top -->
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

                    <!-- Studios below genres (simplified, no box/background) -->
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

                    <!-- Producers below studios (simplified, no box/background) -->
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

                    <!-- Description (font size and spacing matches your reference) -->
                    <!-- Description label outside the scrollable/overflow area -->
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

                    <!-- Watch Button below description -->
                    {#if !isMobile}
                      {#if firstEpisodeId !== null}
                        <a
                          href={`/watch/${encodeURIComponent(firstEpisodeId)}`}
                          class="inline-flex items-center gap-2 bg-orange-400 hover:bg-orange-500 text-gray-900 font-bold px-5 py-2 rounded-lg shadow transition text-sm md:ml-0 ml-[-8px]"
                          style="margin-bottom: 0.5rem;"
                        >
                          <!-- Watch Icon SVG -->
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
              {#if seasons.length > 1}
                <section class="mb-6">
                  <h2 class="text-lg sm:text-xl font-bold text-orange-400 mb-4">More Seasons</h2>
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {#each seasons.filter(s => s && s.id && s.title) as season}
                      <a
                        href={`/info/${encodeURIComponent(season.id)}`}
                        class="group relative bg-gray-800 rounded-lg overflow-hidden border-2
                          {season.isCurrent ? 'border-orange-400 shadow-lg shadow-orange-400/20' : 'border-gray-700'}
                          flex items-end min-h-[72px] sm:min-h-[96px] transition-all duration-200"
                      >
                        <div class="absolute inset-0">
                          <img 
                            src={season.poster || '/assets/placeholder-anime.jpg'} 
                            alt={safeTruncate(season.title, 30)} 
                            class="w-full h-full object-cover" 
                            loading="lazy"
                            on:error={handleImageError}
                          />
                          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        </div>
                        {#if season.isCurrent}
                          <div class="absolute top-2 right-2 bg-orange-400 text-gray-900 px-2 py-1 rounded-full text-xs font-bold z-10">
                            Current
                          </div>
                        {/if}
                        <div class="relative w-full p-2 flex items-center justify-center">
                          <span class="text-white font-semibold text-sm drop-shadow-lg text-center w-full break-words leading-tight">
                            {safeTruncate(season.title, 40)}
                          </span>
                        </div>
                      </a>
                    {/each}
                  </div>
                </section>
              {/if}

              <!-- Characters & Voice Actors -->
              {#if Array.isArray(anime?.charactersVoiceActors) && anime.charactersVoiceActors.length > 0}
                <section class="mb-4"> <!-- Changed from mb-8 to mb-4 -->
                  <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold text-orange-400">Characters & Voice Actors</h2>
                    {#if anime.charactersVoiceActors.length > 2}
                      <button
                        on:click={openCharacterModal}
                        class="text-orange-300 hover:text-orange-400 text-sm font-semibold transition-colors flex items-center gap-1"
                      >
                        View all ({anime.charactersVoiceActors.length})
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    {/if}
                  </div>
                  <div class="flex flex-col gap-3">
                    {#each safeSlice(anime.charactersVoiceActors, 0, 2) as cva}
                      {#if cva && typeof cva === 'object' && 'character' in cva && 'voiceActor' in cva}
                        <CharacterVoiceActorRow cva={cva as CharacterVoiceActor} />
                      {/if}
                    {/each}
                  </div>
                </section>
              {/if}

              <!-- Recommended Anime -->
              {#if recommended.length > 0}
                <section class="mb-6"> <!-- Changed from mb-12 to mb-6 -->
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
                          <img 
                            src={rec.poster || '/assets/placeholder-anime.jpg'} 
                            alt={safeTruncate(rec.name, 50)} 
                            class="w-full h-full object-cover" 
                            loading="lazy"
                            on:error={handleImageError}
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
                          <img 
                            src={rel.poster || '/assets/placeholder-anime.jpg'} 
                            alt={safeTruncate(rel.name, 50)} 
                            class="w-full h-full object-cover" 
                            loading="lazy"
                            on:error={handleImageError}
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

          <!-- Sidebar -->
          <Sidebar
            sidebarTab={sidebarTab}
            setSidebarTab={(tab) => sidebarTab = tab}
            top10Today={data?.top10Animes?.today ?? []}
            top10Week={data?.top10Animes?.week ?? []}
            top10Month={data?.top10Animes?.month ?? []}
          />
        </div>
      </div>
    </div>
  {/if}

  <Footer />
</div>

<!-- Character Modal -->
{#if showCharacterModal && anime?.charactersVoiceActors && Array.isArray(anime.charactersVoiceActors)}
  <CharacterModal
    handleBackdrop={handleModalBackdropClick}
    charactersVoiceActors={anime.charactersVoiceActors}
    onClose={closeCharacterModal}
  />
{/if}

<style>
  @media (max-width: 768px) {
    .flex-shrink-0 {
      margin-left: auto;
      margin-right: auto;
    }
  }
</style>