<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import PlayerCard from '$lib/components/watch/PlayerCard.svelte';
  import ServerSelector from '$lib/components/watch/ServerSelector.svelte';
  import PlayerSelector from '$lib/components/watch/PlayerSelector.svelte';
  import PlayerController from '$lib/components/watch/PlayerController.svelte'; // <-- Add this import
  import EpisodeSelector from '$lib/components/watch/EpisodeSelector.svelte';
  import type { PageData } from './$types.js';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let data;

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

  // --- Pagination ---
  let episodesPerPage = 50;
  let currentPage = 1;
  $: totalPages = Math.ceil(episodes.length / episodesPerPage);
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

  // --- Navigation & Selection ---
  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) currentPage = page;
  }

  async function goToEpisode(episodeId: string) {
    if (episodeId && episodeId !== currentEpisodeId) {
      currentEpisodeId = episodeId;
      const animeKey = data.anime?.info?.id ? `lastEpisodeId:${data.anime.info.id}` : null;
      if (animeKey) localStorage.setItem(animeKey, episodeId);

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
  });

  function handlePageChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedPage = parseInt(target.value, 10);
    if (!isNaN(selectedPage)) {
      goToPage(selectedPage);
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
  const DESCRIPTION_LIMIT = 620;

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

  if (browser) {
    // Add/remove event listener for click outside
    $: {
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
  <div class="flex-1 px-4 py-4 pt-16 flex flex-col">
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
          <div class="flex flex-col gap-2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg shadow-2xl p-3 sm:p-8">
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
              />
            </div>
          </div>

          <!-- Anime Info Card -->
          {#if data.anime && data.anime.info && data.anime.moreInfo}
            <div class="flex flex-col md:flex-row gap-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg shadow-2xl p-6 md:p-10 w-full">
              <!-- Move icon to the left column -->
              <div class="flex flex-col items-center md:items-start flex-shrink-0 mx-auto md:mx-0">
                <img
                  src={data.anime.info.poster}
                  alt={data.anime.info.name}
                  class="rounded-lg shadow-2xl w-64 h-auto object-cover border-4 border-gray-800"
                />
              </div>
              <div class="flex-1 space-y-3">
                <!-- Anime Title (no icon here) -->
                <div class="flex items-center gap-2 sm:gap-3 leading-relaxed md:ml-0 ml-[-8px]">
                  <h1 class="text-2xl sm:text-3xl font-bold text-orange-400 {isMobile ? 'w-full text-center' : ''}">
                    {data.anime.info.name}
                  </h1>
                </div>
                
                <!-- Episode Info -->
                <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm leading-relaxed md:ml-0 ml-[-8px]">
                  <span class="bg-orange-400 text-gray-900 px-2 py-1 rounded font-semibold">
                    Episode {episodes.find(e => e.episodeId === currentEpisodeId)?.number || 'N/A'}
                  </span>
                  <span class="bg-gray-800 text-orange-300 px-2 py-1 rounded">
                    {data.anime.info.stats.type}
                  </span>
                  <span class="bg-gray-800 text-orange-300 px-2 py-1 rounded">
                    {category?.toUpperCase()}
                  </span>
                  <span class="bg-gray-800 text-orange-300 px-2 py-1 rounded">
                    ⭐ {data.anime.info.stats.rating}
                  </span>
                </div>

                <!-- Detailed Info - Always Visible -->
                <div class="space-y-3">
                  {#if data.anime.moreInfo.genres}
                    <div class="flex flex-wrap gap-1.5 leading-relaxed md:ml-0 ml-[-8px]">
                      {#each data.anime.moreInfo.genres as genre}
                        <a
                          href={`/genre/${genre.replace(/\s+/g, '-').toLowerCase()}`}
                          class="bg-gray-800 text-orange-300 px-2 py-1 rounded text-xs font-medium hover:bg-gray-700 transition"
                        >
                          {genre}
                        </a>
                      {/each}
                    </div>
                  {/if}
                  
                  <!-- Overview label above description -->
                  <span class="text-orange-300 font-semibold block md:ml-0 ml-[-8px] mt-1">Overview:</span>
                  {#if isMobile}
                    <div
                      class="text-gray-200 text-sm leading-relaxed md:ml-0 ml-[-8px]"
                      style="max-height: 220px; overflow-y: auto;"
                    >
                      {data.anime.info.description}
                    </div>
                  {:else if isLongDescription && !showFullDescription}
                    <div
                      class="text-gray-200 text-sm leading-relaxed md:ml-0 ml-[-8px] line-clamp-3 sm:line-clamp-5"
                      style="overflow: hidden; position: relative;"
                    >
                      {data.anime.info.description.slice(0, DESCRIPTION_LIMIT) + '...'}
                      <button
                        class="text-orange-300 hover:text-orange-400 text-xs font-semibold ml-1"
                        on:click={() => showFullDescription = true}
                        style="background: none; border: none; cursor: pointer;"
                      >
                        + More
                      </button>
                    </div>
                  {:else if isLongDescription && showFullDescription}
                    <div
                      class="text-gray-200 text-sm leading-relaxed md:ml-0 ml-[-8px]"
                      style="overflow: hidden;"
                    >
                      {data.anime.info.description}
                      <button
                        class="text-orange-300 hover:text-orange-400 text-xs font-semibold ml-1"
                        on:click={() => showFullDescription = false}
                        style="background: none; border: none; cursor: pointer;"
                      >
                        Less
                      </button>
                    </div>
                  {:else}
                    <div
                      class="text-gray-200 text-sm leading-relaxed md:ml-0 ml-[-8px]"
                      style="overflow: hidden;"
                    >
                      {data.anime.info.description}
                    </div>
                  {/if}
                  
                  <!-- Studios (inline, comma-separated, no box) -->
                  {#if data.anime.moreInfo.studios && (
                    (Array.isArray(data.anime.moreInfo.studios) && data.anime.moreInfo.studios.filter((s: string) => s && s.trim()).length > 0) ||
                    (typeof data.anime.moreInfo.studios === 'string' && data.anime.moreInfo.studios.split(',').filter((s: string) => s.trim()).length > 0)
                  )}
                    <div class="text-sm flex flex-wrap items-center gap-2 md:ml-0 ml-[-8px] mt-2">
                      <span class="text-orange-300 font-medium">
                        Studio{Array.isArray(data.anime.moreInfo.studios) && data.anime.moreInfo.studios.length > 1 ? 's' : ''}:
                      </span>
                      {#each (
                        Array.isArray(data.anime.moreInfo.studios)
                          ? data.anime.moreInfo.studios
                          : data.anime.moreInfo.studios.split(',').map((s: string) => s.trim())
                      ).filter((s: string) => s) as studio, i}
                        <span
                          role="link"
                          tabindex="0"
                          class="cursor-pointer hover:underline hover:text-orange-400 transition text-xs"
                          on:click={() => goto(`/producer/${encodeURIComponent(studio.replace(/\./g, '').replace(/\s+/g, '-').toLowerCase())}`)}
                          on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') goto(`/producer/${encodeURIComponent(studio.replace(/\./g, '').replace(/\s+/g, '-').toLowerCase())}`); }}
                        >
                          {studio}{i < (
                            Array.isArray(data.anime.moreInfo.studios)
                              ? data.anime.moreInfo.studios.filter((s: string) => s)
                              : data.anime.moreInfo.studios.split(',').map((s: string) => s.trim()).filter((s: string) => s)
                          ).length - 1 ? ',' : ''}
                        </span>
                      {/each}
                    </div>
                  {/if}

                  <!-- Producers (inline, comma-separated, no box) -->
                  {#if data.anime.moreInfo.producers && (
                    (Array.isArray(data.anime.moreInfo.producers) && data.anime.moreInfo.producers.filter((s: string) => s && s.trim()).length > 0) ||
                    (typeof data.anime.moreInfo.producers === 'string' && data.anime.moreInfo.producers.split(',').filter((s: string) => s.trim()).length > 0)
                  )}
                    <div class="text-sm flex flex-wrap items-center gap-2 md:ml-0 ml-[-8px] mt-1">
                      <span class="text-orange-300 font-medium">
                        Producer{Array.isArray(data.anime.moreInfo.producers) && data.anime.moreInfo.producers.length > 1 ? 's' : ''}:
                      </span>
                      {#each (
                        Array.isArray(data.anime.moreInfo.producers)
                          ? data.anime.moreInfo.producers
                          : data.anime.moreInfo.producers.split(',').map((s: string) => s.trim())
                      ).filter((s: string) => s) as producer, i}
                        <span
                          role="link"
                          tabindex="0"
                          class="cursor-pointer hover:underline hover:text-orange-400 transition text-xs"
                          on:click={() => goto(`/producer/${encodeURIComponent(producer.replace(/\./g, '').replace(/\s+/g, '-').toLowerCase())}`)}
                          on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') goto(`/producer/${encodeURIComponent(producer.replace(/\./g, '').replace(/\s+/g, '-').toLowerCase())}`); }}
                        >
                          {producer}{i < (
                            Array.isArray(data.anime.moreInfo.producers)
                              ? data.anime.moreInfo.producers.filter((s: string) => s)
                              : data.anime.moreInfo.producers.split(',').map((s: string) => s.trim()).filter((s: string) => s)
                          ).length - 1 ? ',' : ''}
                        </span>
                      {/each}
                    </div>
                  {/if}

                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
                    <div class="bg-gray-800 p-2 rounded">
                      <span class="text-orange-300 font-medium">Episodes:</span>
                      <div class="text-white">{data.anime.info.stats.episodes.sub} Sub / {data.anime.info.stats.episodes.dub} Dub</div>
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
        </section>
      </div>

      <!-- Recommended and Related Animes Sections -->
      {#if data.recommendedAnimes && data.recommendedAnimes.length}
        <section class="max-w-[1920px] w-full mx-auto mt-6"> <!-- Updated from max-w-7xl -->
          <h2 class="text-xl font-bold text-orange-400 mb-4">Recommended Anime</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
            {#each data.recommendedAnimes as rec}
              <a 
                href={`/info/${rec.id}`}
                class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03]"
                style="min-height: 120px;"
              >
                <div class="relative aspect-[3/4]">
                  <img
                    src={rec.poster}
                    alt={rec.name}
                    class="w-full h-full object-cover"
                    loading="lazy"
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
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
            {#each data.relatedAnimes as rel}
              <a 
                href={`/info/${rel.id}`}
                class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03]"
                style="min-height: 120px;"
              >
                <div class="relative aspect-[3/4]">
                  <img
                    src={rel.poster}
                    alt={rel.name}
                    class="w-full h-full object-cover"
                    loading="lazy"
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

    .player-full-width {
      width: 100%; /* Make player full width on mobile */
      margin-left: 0; /* Remove any left margin */
      margin-right: 0; /* Remove any right margin */
    }
  }

  /* Add to your <style> block if not using Tailwind line-clamp */
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
@media (min-width: 640px) {
  .line-clamp-3 {
    -webkit-line-clamp: 5;
    line-clamp: 5;
  }
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

  /* Adjust player aspect ratio for wider screens */
  @media (min-width: 1440px) {
    .aspect-video {
      max-height: 80vh;
      width: auto;
      margin: 0 auto;
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