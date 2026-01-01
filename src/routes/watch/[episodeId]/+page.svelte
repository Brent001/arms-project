<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import PlayerCard from '$lib/components/watch/PlayerCard.svelte';
  import ServerSelector from '$lib/components/watch/ServerSelector.svelte';
  import PlayerSelector from '$lib/components/watch/PlayerSelector.svelte';
  import PlayerController from '$lib/components/watch/PlayerController.svelte'; // <-- Add this import
  import EpisodeSelector from '$lib/components/watch/EpisodeSelector.svelte';
  import SeasonCard from '$lib/components/SeasonCard.svelte';
  import type { PageData } from './$types.js';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let data;

  // --- Type Definitions ---
  type Season = {
    id: string;
    title: string;
    [key: string]: any; // Allow other properties
  };

  // --- Type Guards & Helpers ---
  const isError = (d: PageData): d is Extract<PageData, { error: string }> =>
    typeof d === 'object' && d !== null && 'error' in d;
  const safe = <T,>(v: T | undefined | null, fallback: T) => v ?? fallback;

  // --- State ---
  let episodes: any[] = !isError(data) ? safe(data.episodes, []) : [];
  let currentEpisodeId: string = safe(data.episodeId, '');
  let servers: { serverId: number; serverName: string; category: 'sub' | 'dub' | 'raw' }[] = [];
  let currentServer = '';
  let category: 'sub' | 'dub' | 'raw' = 'sub';
  let videoSrc = '';
  let subtitles: Array<{ url: string; label: string; lang: string; kind: 'subtitles' | 'metadata' | 'captions' | 'chapters' | 'descriptions'; default?: boolean }> = [];
  let poster = !isError(data) ? safe(data.anime?.info?.poster, 'https://example.com/default-poster.jpg') : 'https://example.com/default-poster.jpg';
  let title = !isError(data) ? safe(data.anime?.info?.name, 'Episode') : 'Episode';
  let intro: { start: number; end: number } | null = null;
  let outro: { start: number; end: number } | null = null;
  let useArtPlayer = false;
  let useIframePlayer = false;
  let loading = true;
  let thumbnailsVtt = '';
  let updatingSources = false;
  let autoPlay = false;
  let autoSkipIntro = false;
  let autoNext = false;
  let imageLoadedStates: { [key: string]: boolean } = {};

  // --- Pagination ---
  let episodesPerPage = 50;
  let currentPage = 1;
  $: totalPages = Math.ceil(episodes.length / episodesPerPage);
  $: {
    const currentEpisodeIndex = episodes.findIndex(
      (ep) => ep.episodeId === currentEpisodeId
    );
    if (currentEpisodeIndex !== -1) {
      currentPage = Math.floor(currentEpisodeIndex / episodesPerPage) + 1;
    }
  }
  $: pagedEpisodes = episodes.slice(
    (currentPage - 1) * episodesPerPage,
    currentPage * episodesPerPage
  );
  $: episodeRanges = Array.from({ length: totalPages }, (_, i) => {
    const start = i * episodesPerPage + 1;
    const end = Math.min((i + 1) * episodesPerPage, episodes.length);
    return `${start}-${end}`;
  });

  // --- Proxy Helper ---
  function proxiedM3u8(url: string) {
    if (!url) return url;
    if (url.endsWith('.m3u8')) {
      // Optionally encode headers if needed
      return `/api/proxy/m3u8?url=${encodeURIComponent(url)}`;
    }
    return url;
  }

  // --- Fetch Logic ---
  async function fetchWatchData(episodeId: string, server: string, category: string, showLoading = true) {
    if (showLoading) loading = true;
    try {
      const params = new URLSearchParams({
        action: 'sources',
        animeEpisodeId: episodeId,
        server,
        category,
      });
      const apiUrl = `/api/anime?${params}`;
      const resp = await fetch(apiUrl);
      const json = await resp.json();

      if (!json.success) throw new Error('No sources');

      // Use proxy for m3u8 sources
      const source = json.data.sources?.[0]?.url || '';
      videoSrc = proxiedM3u8(source);

      subtitles = (json.data.tracks ?? [])
        .filter((track: any) => track.lang !== 'thumbnails')
        .map((track: any) => ({
          src: track.url,
          label: track.lang,
          srclang: track.srclang || track.lang || 'en'
        }));

      intro = json.data.intro || null;
      outro = json.data.outro || null;
    } catch {
      videoSrc = '';
      subtitles = [];
      intro = null;
      outro = null;
    } finally {
      if (showLoading) loading = false;
    }
  }

  async function fetchServers(episodeId: string) {
    try {
      const params = new URLSearchParams({
        action: 'servers',
        animeEpisodeId: episodeId,
      });
      const apiUrl = `/api/anime?${params.toString()}`;
      const resp = await fetch(apiUrl);
      const json = await resp.json();

      if (json.success) {
        servers = Object.entries(json.data)
          .filter(([category]) => ['sub', 'dub', 'raw'].includes(category))
          .flatMap(([category, serverList]: [string, unknown]) =>
            (serverList as any[]).map((server) => ({
              ...server,
              category: category as 'sub' | 'dub' | 'raw',
            }))
          )
          .sort((a, b) => a.serverName.localeCompare(b.serverName));
        servers = servers.filter((server) => server.serverName);

        // --- Default server logic with localStorage ---
        const animeId = data.anime?.info?.id;
        let lastServerKey = animeId ? `lastServer:${animeId}` : null;
        let lastServer = lastServerKey ? localStorage.getItem(lastServerKey) : null;
        let preferred = servers.find(s => s.serverName === lastServer);

        if (!preferred) preferred = servers.find(s => s.serverName.toLowerCase() === 'hd-2');
        if (!preferred) preferred = servers.find(s => s.serverName.toLowerCase() === 'hd-1');
        if (!preferred) preferred = servers[0];

        if (preferred) {
          currentServer = preferred.serverName;
          category = preferred.category;
        }
      }
    } catch (err) {
      // handle error
    }
  }

  // --- Save to Recent Anime (Enhanced) ---
  function saveToRecentAnime() {
    if (browser && data.anime?.info) {
      const recentAnime = JSON.parse(localStorage.getItem('recentAnime') || '[]');
      const existingIndex = recentAnime.findIndex((a: any) => a.id === data.anime.info.id);
      const ep = episodes.find(e => e.episodeId === currentEpisodeId);
      
      let lastEpisodeNumber = currentEpisodeId;
      if (ep && ep.number) {
        lastEpisodeNumber = ep.number;
      } else {
        const parts = currentEpisodeId.split('?')[0].split('-');
        const num = parts.find(p => /^\d+$/.test(p));
        if (num) {
          lastEpisodeNumber = num;
        }
      }
      
      const item = {
        id: data.anime.info.id,
        name: data.anime.info.name,
        poster: data.anime.info.poster,
        type: data.anime.info.stats?.type || data.anime.info.type || 'TV', // Save the anime type
        lastEpisodeId: currentEpisodeId,
        lastEpisodeNumber,
        lastWatchedAt: new Date().toISOString()
      };
      
      if (existingIndex >= 0) {
        recentAnime[existingIndex] = item;
      } else {
        recentAnime.unshift(item);
        if (recentAnime.length > 20) recentAnime.pop();
      }
      localStorage.setItem('recentAnime', JSON.stringify(recentAnime));
    }
  }

  // --- Navigation & Selection ---
  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) currentPage = page;
  }

  async function goToEpisode(episodeId: string) {
    if (episodeId && episodeId !== currentEpisodeId) {
      currentEpisodeId = episodeId;
      const animeKey = data.anime?.info?.id ? `lastEpisodeId:${data.anime.info.id}` : null;
      if (animeKey) localStorage.setItem(animeKey, episodeId);

      // Save to recent anime whenever episode changes
      saveToRecentAnime();

      await fetchServers(episodeId);
      await fetchWatchData(episodeId, currentServer, category, false);

      goto(`/watch/${episodeId}`);
    }
  }

  function changeServerManual(serverName: string, cat: 'sub' | 'dub' | 'raw') {
    currentServer = serverName;
    category = cat;
    // Save last server per anime
    const animeId = data.anime?.info?.id;
    if (animeId) {
      localStorage.setItem(`lastServer:${animeId}`, serverName);
    }
    fetchWatchData(currentEpisodeId, currentServer, category, false);
  }

  function changeCategoryManual(cat: 'sub' | 'dub' | 'raw') {
    if (category !== cat) {
      category = cat;
      fetchWatchData(currentEpisodeId, currentServer, category);
      useIframePlayer = false; // Reset iframe player when category changes
    }
  }

  function setUseArtPlayer(v: boolean) { useArtPlayer = v; }
  function setUseIframePlayer(v: boolean) { useIframePlayer = v; }

  // --- On Mount: Restore Last Watched ---
  onMount(async () => {
    loading = true;
    const animeKey = data.anime?.info?.id ? `lastEpisodeId:${data.anime.info.id}` : null;
    let saved = animeKey ? localStorage.getItem(animeKey) : null;

    if (saved && episodes.some((e: any) => e.episodeId === saved)) {
      currentEpisodeId = saved;
      if (currentEpisodeId !== data.episodeId) goto(`/watch/${currentEpisodeId}`, { replaceState: true });
    } else if ((!currentEpisodeId || !episodes.some((e: any) => e.episodeId === currentEpisodeId)) && episodes.length > 0) {
      currentEpisodeId = episodes[0].episodeId;
      goto(`/watch/${currentEpisodeId}`, { replaceState: true });
    }

    await fetchServers(currentEpisodeId);

    await fetchWatchData(currentEpisodeId, currentServer, category);

    loading = false;

    // Save to recent anime
    if (browser && data.anime?.info) {
      const recentAnime = JSON.parse(localStorage.getItem('recentAnime') || '[]');
      const existingIndex = recentAnime.findIndex((a: any) => a.id === data.anime.info.id);
      const ep = episodes.find(e => e.episodeId === currentEpisodeId);
      let lastEpisodeNumber = currentEpisodeId;
      if (ep && ep.number) {
        lastEpisodeNumber = ep.number;
      } else {
        const parts = currentEpisodeId.split('?')[0].split('-');
        const num = parts.find(p => /^\d+$/.test(p));
        if (num) {
          lastEpisodeNumber = num;
        }
      }
      const item = {
        id: data.anime.info.id,
        name: data.anime.info.name,
        poster: data.anime.info.poster,
        type: data.anime.info.type,
        lastEpisodeId: currentEpisodeId,
        lastEpisodeNumber,
        lastWatchedAt: new Date().toISOString()
      };
      if (existingIndex >= 0) {
        recentAnime[existingIndex] = item;
      } else {
        recentAnime.unshift(item);
        if (recentAnime.length > 20) recentAnime.pop();
      }
      localStorage.setItem('recentAnime', JSON.stringify(recentAnime));
    }
  });

  function handlePageChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedPage = parseInt(target.value, 10);
    if (!isNaN(selectedPage)) {
      goToPage(selectedPage);
    }
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

  async function handleRefreshSource(videoUrl: string) {
    updatingSources = true;
    await fetch(`/api/anime?action=delete-source-cache&animeEpisodeId=${currentEpisodeId}&category=${category}`);
    await fetchWatchData(currentEpisodeId, currentServer, category, false);
    updatingSources = false;
  }

  const AUTO_PLAY_KEY = 'arms:autoPlay';
  const AUTO_SKIP_INTRO_KEY = 'arms:autoSkipIntro';
  const AUTO_NEXT_KEY = 'arms:autoNext';

  function saveToggle(key: string, value: boolean) {
    localStorage.setItem(key, value ? '1' : '0');
  }
  function loadToggle(key: string, fallback = false): boolean {
    if (typeof localStorage === 'undefined') return fallback;
    const v = localStorage.getItem(key);
    return v === '1' ? true : v === '0' ? false : fallback;
  }

  onMount(() => {
    autoPlay = loadToggle(AUTO_PLAY_KEY, false);
    autoSkipIntro = loadToggle(AUTO_SKIP_INTRO_KEY, false);
    autoNext = loadToggle(AUTO_NEXT_KEY, false);
  });

  let showFullDescription = false;
  let isLongDescription = false;
  let isMobile = false;
  const DESCRIPTION_LIMIT = 450; // Adjusted from 620

  // Add these new variables for genre/studio/producer expand/collapse
  let showAllGenres = false;
  let showAllStudios = false;
  let showAllProducers = false;

  // Derived variables for studios and producers for cleaner logic
  $: allStudios =
    data.anime?.moreInfo?.studios
      ? (
          Array.isArray(data.anime.moreInfo.studios)
            ? data.anime.moreInfo.studios
            : data.anime.moreInfo.studios.split(',').map((s: string) => s.trim())
        ).filter((s: string) => s)
      : [];
  $: displayedStudios = isMobile && !showAllStudios ? allStudios.slice(0, 3) : allStudios;

  $: allProducers =
    data.anime?.moreInfo?.producers
      ? (
          Array.isArray(data.anime.moreInfo.producers)
            ? data.anime.moreInfo.producers
            : data.anime.moreInfo.producers.split(',').map((s: string) => s.trim())
        ).filter((s: string) => s)
      : [];
  $: displayedProducers = isMobile && !showAllProducers ? allProducers.slice(0, 3) : allProducers;


  $: isLongDescription = !!data.anime?.info?.description && data.anime.info.description.length > DESCRIPTION_LIMIT;

  function updateIsMobile() {
    if (browser) {
      isMobile = window.innerWidth <= 768;
    }
  }

  if (browser) {
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
  }

  let showPageDropdown = false;
  let isFullScreen = false;

  function updateIsFullScreen() {
    if (browser) {
      isFullScreen = window.innerWidth >= 1024; // Desktop breakpoint
    }
  }

  if (browser) {
    updateIsFullScreen();
    window.addEventListener('resize', updateIsFullScreen);
  }

  // Helper to format ranges as "EPS: 1-50"
  function formatRange(range: string, i: number) {
    const [start, end] = range.split('-');
    return `EPS: ${start}-${end}`;
  }

  // Optional: Close dropdown on click outside
  function handleClickOutside(event: MouseEvent) {
    const dropdown = document.getElementById('page-dropdown');
    if (dropdown && !dropdown.contains(event.target as Node)) {
      showPageDropdown = false;
    }
  }

  // Add/remove event listener for click outside
  $: {
    if (browser) {
      if (showPageDropdown) {
        window.addEventListener('mousedown', handleClickOutside);
      } else {
        window.removeEventListener('mousedown', handleClickOutside);
      }
    }
  }

  $: isGridMode = episodes.length > 30;
</script>

<svelte:head>
  <title>Watch {data.anime?.info?.name || 'Anime'} | Arms Anime</title>
  <meta name="description" content="Watch {data.anime?.info?.name || 'anime'} episode {data.episodeId} online for free. Enjoy high-quality streaming with subtitles and multiple servers." />
</svelte:head>

<Navbar/>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col">
  <div class="flex-1 px-2 sm:px-4 py-4 pt-16 flex flex-col">
    {#if loading && !updatingSources}
      <div class="flex-1 flex items-center justify-center">
        <img src="/assets/loader.gif" alt="Loading..." style="max-width: 120px; max-height: 110px;" />
      </div>
    {:else if isError(data)}
      <div class="max-w-2xl mx-auto text-center text-red-400 text-xl font-bold py-20">
        {safe(data.error, 'An unknown error occurred.')}
      </div>
    {:else}
      <div class="max-w-[1920px] w-full mx-auto flex flex-col gap-10">
        <section class="flex-1 flex flex-col gap-3 mb-6"> <!-- changed from gap-8 to gap-3 -->
          <!-- Player Card -->
          <div class="flex flex-col gap-2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg shadow-2xl p-1.5 sm:p-6">
            <PlayerCard
              {videoSrc}
              {poster}
              {subtitles}
              {useArtPlayer}
              {useIframePlayer}
              goToEpisode={goToEpisode}
              onRefreshSource={handleRefreshSource}
              {intro}
              {outro}
              {autoSkipIntro}
              animeInfo={data.anime?.info}
              episodeNum={episodes.find(e => e.episodeId === currentEpisodeId)?.number}
              episodes={episodes}
              autoNext={autoNext}
              episodeId={
                (() => {
                  const match = currentEpisodeId.match(/ep=(\d+)/);
                  return match ? match[1] : currentEpisodeId;
                })()
              }
              {category}
            />

            <!-- Use PlayerController component here -->
            <div class="sm:block flex justify-center"> <!-- Center on mobile, block on desktop -->
              <PlayerController
                {autoPlay}
                {autoSkipIntro}
                {autoNext}
                setAutoPlay={v => { autoPlay = v; saveToggle(AUTO_PLAY_KEY, v); }}
                setAutoSkipIntro={v => { autoSkipIntro = v; saveToggle(AUTO_SKIP_INTRO_KEY, v); }}
                setAutoNext={v => { autoNext = v; saveToggle(AUTO_NEXT_KEY, v); }}
              />
            </div>

            <div class="bg-gray-800 rounded-lg p-4 shadow-lg">
              <PlayerSelector
                {useIframePlayer}
                setUseIframePlayer={setUseIframePlayer}
                animeId={data.anime?.info?.id}
                serverName={currentServer}
              />
              
              <div class="my-3"></div>
              
              <ServerSelector
                {servers}
                {currentServer}
                {category}
                {changeServerManual}
              />
            </div>

            <!-- Paging dropdown OUTSIDE the scroll area -->
            {#if episodes.length > 1 && totalPages > 1}
              <div class="flex items-center gap-2 mb-2 relative z-10">
                <span class="font-semibold text-orange-400 text-xs">Pages:</span>
                <div class="relative w-32" id="page-dropdown">
                  <button
                    class="w-full px-2 py-1 rounded bg-gray-800 text-white text-xs flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-orange-400 font-bold"
                    on:click={() => showPageDropdown = !showPageDropdown}
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={showPageDropdown}
                  >
                    {formatRange(episodeRanges[currentPage - 1], currentPage - 1)}
                    <svg class="w-3 h-3 ml-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  {#if showPageDropdown}
                    <ul
                      class="absolute z-20 mt-1 w-full bg-gray-900 border border-gray-700 rounded shadow max-h-48 overflow-y-auto"
                    >
                      {#each episodeRanges as range, i}
                        <button
                          type="button"
                          class="w-full text-left px-3 py-2 cursor-pointer flex items-center hover:bg-orange-400 hover:text-gray-900 text-xs
                            {currentPage === i + 1 ? 'bg-gray-800 font-bold' : ''}"
                          on:click={() => { goToPage(i + 1); showPageDropdown = false; }}
                          aria-current={currentPage === i + 1 ? "page" : undefined}
                        >
                          {formatRange(range, i)}
                          {#if currentPage === i + 1}
                            <svg class="w-4 h-4 ml-auto text-orange-400" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                          {/if}
                        </button>
                      {/each}
                    </ul>
                  {/if}
                </div>
              </div>
            {/if}

            <!-- EpisodeSelector with mobile scroll -->
            <div class="episode-selector-scroll" class:list-mode-limited={!isGridMode}>
              <EpisodeSelector
                {episodes}
                {pagedEpisodes}
                {episodeRanges}
                {currentPage}
                {currentEpisodeId}
                {handlePageChange}
                {goToEpisode}
                animeType={data.anime?.info?.stats?.type}
              />
            </div>
          </div>

          <!-- Anime Info Card -->
          {#if data.anime && data.anime.info && data.anime.moreInfo}
            <div class="flex flex-col md:flex-row gap-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg shadow-2xl p-6 md:p-10">
              <!-- Poster -->
              <div class="flex flex-col items-center md:items-start flex-shrink-0 mx-auto md:mx-0">
                <div class="relative w-64 aspect-[3/4] rounded-lg border-4 border-gray-800 overflow-hidden bg-gray-800">
                  {#if !imageLoadedStates[`main-${data.anime.info.id}`]}
                    <div class="skeleton-loader absolute inset-0"></div>
                  {/if}
                  <img
                    src={data.anime.info.poster}
                    alt={data.anime.info.name}
                    class="shadow-2xl w-full h-full object-cover {imageLoadedStates[`main-${data.anime.info.id}`] ? 'opacity-100' : 'opacity-0'}"
                    on:error={handleImageError}
                    on:load={() => handleImageLoad(`main-${data.anime.info.id}`)}
                  />
                </div>
              </div>
              <!-- Details -->
              <div class="flex-1 space-y-3">
                <div class="flex items-center gap-2 sm:gap-3 md:ml-0 ml-[-8px]">
                  <h1 class="text-xl sm:text-3xl font-bold text-orange-400 
                    {isMobile ? 'w-full text-center' : ''}">
                  {data.anime.info.name || 'Unknown Anime'}
                  </h1>
                </div>

                <!-- Anime Stats -->
                {#if data.anime.info.stats}
                  <div class="flex flex-wrap items-center gap-3 text-sm text-gray-300 md:ml-0 ml-[-8px] {isMobile ? 'justify-center' : ''}">
                    <!-- Badges Group -->
                    <div class="flex items-center gap-1">
                      {#if data.anime.info.stats.rating}
                        <span class="bg-white text-gray-900 px-2 py-0.5 rounded text-xs font-bold">{data.anime.info.stats.rating}</span>
                      {/if}
                      {#if data.anime.info.stats.quality}
                        <span style="background-color: #ff7693;" class="text-white px-2 py-0.5 rounded text-xs font-bold">{data.anime.info.stats.quality}</span>
                      {/if}
                    </div>

                    <!-- Type & Duration Group -->
                    {#if data.anime.info.stats.type || data.anime.info.stats.duration}
                      <div class="flex items-center gap-1.5 text-xs font-semibold">
                        <span>•</span>
                        {#if data.anime.info.stats.type}
                          <span>{data.anime.info.stats.type}</span>
                        {/if}
                        {#if data.anime.info.stats.type && data.anime.info.stats.duration}
                          <span>•</span>
                        {/if}
                        {#if data.anime.info.stats.duration}
                          <span>{data.anime.info.stats.duration}</span>
                        {/if}
                      </div>
                    {/if}
                  </div>
                {/if}
                
                <div class="space-y-3">
                  <!-- Genres at the top -->
                  {#if data.anime.moreInfo.genres && data.anime.moreInfo.genres.length > 0}
                    <div class="flex flex-wrap items-center gap-1.5 md:ml-0 ml-[-8px]">
                      {#each (isMobile && !showAllGenres ? data.anime.moreInfo.genres.slice(0, 3) : data.anime.moreInfo.genres) as genre}
                        <a
                          href={`/genre/${encodeURIComponent(genre.toLowerCase())}`}
                          class="bg-gray-800 text-orange-300 px-2 py-1 rounded text-xs font-medium hover:bg-gray-700 transition"
                        >
                          {genre}
                        </a>
                      {/each}
                      {#if isMobile && data.anime.moreInfo.genres.length > 3}
                        <button
                          class="text-orange-300 hover:text-orange-400 text-xs font-semibold"
                          on:click={() => (showAllGenres = !showAllGenres)}
                          style="background: none; border: none; cursor: pointer; padding: 0;"
                        >
                          {showAllGenres ? '- Less' : `+${data.anime.moreInfo.genres.length - 3} More`}
                        </button>
                      {/if}
                    </div>
                  {/if}

                  <!-- Studios below genres -->
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

                  <!-- Producers below studios -->
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

                  <span class="text-orange-300 font-semibold block mb-1 md:ml-0 ml-[-8px]">Overview:</span>
                  {#if isMobile}
                    <div
                      class="text-gray-200 text-sm leading-tight md:ml-0 ml-[-8px]"
                      style="max-height: 220px; overflow-y: auto; line-height: 1.4;"
                    >
                      {data.anime.info.description || 'No description available.'}
                    </div>
                  {:else if isLongDescription && !showFullDescription}
                    <div
                      class="text-gray-200 text-sm leading-tight md:ml-0 ml-[-8px]"
                      style="line-height: 1.4; position: relative;"
                    >
                      <span>
                        {data.anime.info.description?.slice(0, DESCRIPTION_LIMIT) || 'No description available.'}...
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
                        {data.anime.info.description}
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
                      {data.anime.info.description || 'No description available.'}
                    </div>
                  {/if}
                  
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
                    <div class="bg-gray-800 p-2 rounded">
                      <span class="text-orange-300 font-medium">Episodes:</span>
                      <div class="text-white">{data.anime.info.stats?.episodes?.sub || 0} Sub / {data.anime.info.stats?.episodes?.dub || 0} Dub</div>
                    </div>
                    <div class="bg-gray-800 p-2 rounded">
                      <span class="text-orange-300 font-medium">Status:</span>
                      <div class="text-white">{data.anime.moreInfo.status}</div>
                    </div>
                    <div class="bg-gray-800 p-2 rounded col-span-2 sm:col-span-1">
                      <span class="text-orange-300 font-medium">Aired:</span>
                      <div class="text-white">{data.anime.moreInfo.aired}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <!-- More Seasons -->
          {#if data.seasons && data.seasons.length > 1}
            <section class="mt-6">
              <h2 class="text-lg sm:text-xl font-bold text-orange-400 mb-4">More Seasons</h2>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {#each data.seasons.filter((s: Season) => s && s.id && s.title) as season}
                  <SeasonCard {season} {imageLoadedStates} onImageLoad={handleImageLoad} />
                {/each}
              </div>
            </section>
          {/if}
        </section>
      </div>

      <!-- Recommended and Related Animes Sections -->
      {#if data.recommendedAnimes && data.recommendedAnimes.length}
        <section class="max-w-[1920px] w-full mx-auto mt-6"> <!-- Updated from max-w-7xl -->
          <h2 class="text-xl font-bold text-orange-400 mb-4">Recommended Anime</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 2xl:grid-cols-7 gap-2">
            {#each data.recommendedAnimes as rec}
              <a 
                href={`/info/${rec.id}`}
                class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03]"
                style="min-height: 120px;"
              >
                <div class="relative aspect-[3/4]">
                  {#if !imageLoadedStates[`rec-${rec.id}`]}
                    <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                  {/if}
                  <img
                    src={rec.poster}
                    alt={rec.name}
                    class="w-full h-full object-cover {imageLoadedStates[`rec-${rec.id}`] ? 'opacity-100' : 'opacity-0'}"
                    loading="lazy"
                    on:error={handleImageError}
                    on:load={() => handleImageLoad(`rec-${rec.id}`)}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                </div>
                <div class="absolute bottom-0 left-0 right-0 p-1">
                  <h3 class="font-semibold text-white text-xs mb-0.5 line-clamp-2 group-hover:text-orange-200 transition-colors" title={rec.name}>
                    {rec.name}
                  </h3>
                  <div class="flex flex-wrap gap-0.5">
                    <span class="bg-orange-400 text-gray-900 px-1 py-0.5 rounded text-[9px] font-bold">{rec.type}</span>
                    <span class="bg-gray-900 text-orange-300 px-1 py-0.5 rounded text-[9px]">{rec.episodes.sub} Sub / {rec.episodes.dub} Dub</span>
                  </div>
                </div>
              </a>
            {/each}
          </div>
        </section>
      {/if}

      {#if data.relatedAnimes && data.relatedAnimes.length}
        <section class="max-w-[1920px] w-full mx-auto mt-5"> <!-- Updated from max-w-7xl -->
          <h2 class="text-xl font-bold text-orange-400 mb-4">Related Anime</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 2xl:grid-cols-7 gap-2">
            {#each data.relatedAnimes as rel}
              <a 
                href={`/info/${rel.id}`}
                class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03]"
                style="min-height: 120px;"
              >
                <div class="relative aspect-[3/4]">
                  {#if !imageLoadedStates[`rel-${rel.id}`]}
                    <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                  {/if}
                  <img
                    src={rel.poster}
                    alt={rel.name}
                    class="w-full h-full object-cover {imageLoadedStates[`rel-${rel.id}`] ? 'opacity-100' : 'opacity-0'}"
                    loading="lazy"
                    on:error={handleImageError}
                    on:load={() => handleImageLoad(`rel-${rel.id}`)}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                </div>
                <div class="absolute bottom-0 left-0 right-0 p-1">
                  <h3 class="font-semibold text-white text-xs mb-0.5 line-clamp-2 group-hover:text-orange-200 transition-colors" title={rel.name}>
                    {rel.name}
                  </h3>
                  <div class="flex flex-wrap gap-0.5">
                    <span class="bg-orange-400 text-gray-900 px-1 py-0.5 rounded text-[9px] font-bold">{rel.type}</span>
                    <span class="bg-gray-900 text-orange-300 px-1 py-0.5 rounded text-[9px]">{rel.episodes.sub} Sub / {rel.episodes.dub} Dub</span>
                  </div>
                </div>
              </a>
            {/each}
          </div>
        </section>
      {/if}
    {/if}
  </div>
  <Footer/>
</div>

<!-- Add responsive styles -->
<style>
  @media (max-width: 768px) {
    .flex-shrink-0 {
      margin-left: auto;
      margin-right: auto;
    }
  }

  /* Skeleton Loader - plain background for performance */
  .skeleton-loader {
    background-color: #374151; /* gray-700 */
  }

  img {
    transition: opacity 0.3s ease-in-out;
  }

  /* Mobile scroll for EpisodeSelector */
  .episode-selector-scroll {
    /* Only apply on mobile */
    max-height: none;
    overflow: visible;
  }
  @media (max-width: 768px) {
    .episode-selector-scroll {
      max-height: 220px;
      overflow-y: auto;
      margin-bottom: 0.5rem;
      /* Optional: smooth scroll on iOS */
      -webkit-overflow-scrolling: touch;
      /* Optional: add a subtle border or shadow for clarity */
      border-radius: 0.5rem;
      background: rgba(31, 41, 55, 0.7);
    }
  }

  /* Add responsive container widths */
  @media (min-width: 1920px) {
    .max-w-\[1920px\] {
      max-width: 90vw;
    }
  }

  :global(.episode-selector-scroll.list-mode-limited) {
    max-height: 400px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: 0.5rem;
  }

  :global(.episode-selector-scroll.list-mode-limited::-webkit-scrollbar) {
    width: 6px;
  }

  :global(.episode-selector-scroll.list-mode-limited::-webkit-scrollbar-track) {
    background: rgba(31, 41, 55, 0.5);
    border-radius: 0.25rem;
  }

  :global(.episode-selector-scroll.list-mode-limited::-webkit-scrollbar-thumb) {
    background: rgba(249, 115, 22, 0.5);
    border-radius: 0.25rem;
  }

  :global(.episode-selector-scroll.list-mode-limited::-webkit-scrollbar-thumb:hover) {
    background: rgba(249, 115, 22, 0.7);
  }
</style>