<script lang="ts">
  import Navbar from '$lib/components/hanime/Navbar.svelte';
  import Footer from '$lib/components/hanime/Footer.svelte';
  import PlayerCard from '$lib/components/hanime/watch/PlayerCard.svelte';
  import ServerSelector from '$lib/components/hanime/watch/ServerSelector.svelte';
  import AdultWarning from '$lib/components/hanime/AdultWarning.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  export let data;

  $: info = data?.info;
  $: videoSrc = data?.videoSrc ?? '';
  $: relatedEpisodes = data?.relatedEpisodes ?? [];
  $: similarSeries = data?.similarSeries ?? [];

  $: poster = info?.posterUrl ?? '';
  $: description = info?.description ?? '';
  $: title = info?.title ?? '';
  $: genres = info?.genres ?? [];
  $: studio = info?.studio ?? '';
  $: airDate = info?.airDate ?? '';
  $: rating = info?.rating ?? '';
  $: ratingCount = info?.ratingCount ?? '';

  let showWarning = true;
  let loading = true;
  let showFullDescription = false;
  let isLongDescription = false;
  let isMobile = false;
  const DESCRIPTION_LIMIT = 450;
  let showAllGenres = false;
  let imageLoadedStates: { [key: string]: boolean } = {};

  $: isLongDescription = !!description && description.length > DESCRIPTION_LIMIT;

  function updateIsMobile() {
    if (typeof window !== 'undefined') {
      isMobile = window.innerWidth <= 768;
    }
  }

  function getCookie(name: string) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }
  function setCookie(name: string, value: string, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  }

  if (
    typeof document !== 'undefined' && getCookie('arms18plus') === 'yes' ||
    typeof localStorage !== 'undefined' && localStorage.getItem('arms18plus') === 'yes'
  ) {
    showWarning = false;
  }

  function closeWarning() {
    showWarning = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('arms18plus', 'yes');
    }
    if (typeof document !== 'undefined') {
      setCookie('arms18plus', 'yes', 365);
    }
  }
  function rejectWarning() {
    window.location.href = '/';
  }

  function handleImageLoad(id: string) {
    imageLoadedStates = { ...imageLoadedStates, [id]: true };
  }

  function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    // Use a tiny transparent GIF as a safe fallback so thumbnails always render
    const PLACEHOLDER_DATA_URL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    if (img && !img.dataset.errorHandled) {
      img.dataset.errorHandled = 'true';
      try {
        // Replace the src with the placeholder (explicitly keep this exact string as requested)
        img.src = PLACEHOLDER_DATA_URL;
      } catch (e) {
        // If replacement fails, just silence further errors
      }
      img.onerror = null;
    }
  }

  let searchResults: any[] = [];
  let searchLoading = true;

  onMount(() => {
    if (typeof window !== 'undefined') {
      updateIsMobile();
      window.addEventListener('resize', updateIsMobile);
    }

    loading = false;

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateIsMobile);
      }
    };
  });

  function goToEpisode(id: string) {
    window.location.href = `/hanime/watch/${id}`;
  }

  // Server selector state
  // Expand servers into per-mirror entries so each mp4 mirror appears as its own button
  let serversList: any[] = [];
  $: if (info?.videoServers) {
    serversList = info.videoServers.flatMap((s: any, idx: number) => {
      const serverDisplay = s.server || s.serverName || s.name || `Server ${idx + 1}`;
      const mp4Arr = s.mp4Sources ?? s.mp4s ?? s.mp4_list ?? [];
      if (Array.isArray(mp4Arr) && mp4Arr.length) {
        return mp4Arr.map((m: any, mi: number) => ({
          serverId: `${idx}-${mi}`,
          // unique token used for selection; includes original server name and mirror index
          serverName: `${serverDisplay}__mirror__${mi + 1}`,
          displayName: `HD-${mi + 1}`,
          category: s.category || 'sub',
          source: m
        }));
      }

      // Fallback: if no mp4Sources, fall back to iframeSources or a single server entry
      const iframeArr = s.iframeSources ?? s.sources ?? [];
      if (Array.isArray(iframeArr) && iframeArr.length) {
        return iframeArr.map((m: any, mi: number) => ({
          serverId: `${idx}-${mi}`,
          serverName: `${serverDisplay}__mirror__${mi + 1}`,
          displayName: `HD-${mi + 1}`,
          category: s.category || 'sub',
          source: m
        }));
      }

      return [{
        serverId: `${idx}-0`,
        serverName: serverDisplay,
        displayName: serverDisplay,
        category: s.category || 'sub',
        source: s
      }];
    });
  }

  let currentServerName = '';
  let currentCategory: 'sub' | 'dub' | 'raw' = 'sub';

  // Set default selected server metadata (do not override videoSrc on load)
  $: if (serversList && serversList.length && !currentServerName) {
    currentServerName = serversList[0].serverName;
    currentCategory = serversList[0].category ?? 'sub';
  }

  function handleChangeServer(name: string, category: 'sub' | 'dub' | 'raw') {
    // Find matching server entry in info.videoServers
    currentServerName = name;
    currentCategory = category;
    // Attempt to parse mirror token like "ServerName__mirror__2"
    let picked: any = null;
    const mirrorMatch = typeof name === 'string' && name.match(/(.+)__mirror__([0-9]+)/);
    if (mirrorMatch) {
      const serverDisplay = mirrorMatch[1];
      const mirrorIndex = parseInt(mirrorMatch[2], 10);

      // Find the corresponding videoServers entry by display name
      const vs = (info?.videoServers ?? []).find((s: any) => {
        const sName = s.server || s.serverName || s.name || '';
        return sName === serverDisplay;
      });

      if (vs) {
        const mp4Arr = vs.mp4Sources ?? vs.mp4s ?? vs.mp4_list ?? [];
        if (Array.isArray(mp4Arr) && mp4Arr.length) {
          picked = mp4Arr[mirrorIndex - 1] || mp4Arr[0];
        } else {
          const iframeArr = vs.iframeSources ?? vs.sources ?? [];
          picked = iframeArr[mirrorIndex - 1] || iframeArr[0];
        }
      }
    }

    // If not found via mirror token, try to find in expanded serversList
    if (!picked && Array.isArray(serversList)) {
      const sEntry = serversList.find((s: any) => s.serverName === name || s.displayName === name);
      if (sEntry) picked = sEntry.source || sEntry;
    }

    // Final fallback: use top-level videoSources
    if (!picked && Array.isArray(info?.videoSources)) {
      picked = info.videoSources.find((x: any) => x.type === 'mp4' || (typeof x.url === 'string' && x.url.includes('.mp4'))) || info.videoSources[0];
    }

    if (picked) {
      let url = picked.url ?? picked;
      if (typeof url === 'string' && url.includes('.mp4')) {
        url = `/api/hanime/proxy-mp4?url=${encodeURIComponent(url)}`;
      }
      // assign to reactive videoSrc so Player updates
      videoSrc = url;
    }
  }
</script>

<svelte:head>
  <title>Watch {title} | ARMS Hentai</title>
  <meta name="description" content={description} />
</svelte:head>

<Navbar />

{#if showWarning}
  <AdultWarning onConfirm={closeWarning} onReject={rejectWarning} />
{/if}

<div class="min-h-screen bg-gradient-to-br from-[#1a0106] via-[#2a0008] to-[#3a0d16] text-white flex flex-col relative overflow-x-hidden">
  <div class="pointer-events-none fixed inset-0 z-0">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(255,0,60,0.08),transparent_70%)]"></div>
  </div>

  <main class="relative z-10 flex-1 w-full pt-16 pb-2">
    <div class="max-w-[1920px] mx-auto flex flex-col gap-6 px-2.5 sm:px-4">
      {#if loading}
        <div class="flex items-center justify-center min-h-[300px]">
          <img
            src="/assets/loader.gif"
            alt="Loading..."
            class="mx-auto block"
            style="max-width: 120px; max-height: 110px;"
          />
        </div>
      {:else}
        {#if info}
          <section class="flex-1 flex flex-col gap-3 mb-6">
            <!-- Player Card -->
            <div class="player-card-mobile flex flex-col gap-3 bg-gradient-to-br from-[#1a0106] via-[#2a0008] to-[#3a0d16] rounded-sm shadow-2xl border border-[#ff003c]/20 p-1.5 sm:p-6">
              {#key `${info?.id ?? title}-${videoSrc}`}
                <PlayerCard
                  videoSrc={videoSrc}
                  poster={poster}
                  subtitles={[]}
                />
              {/key}
            </div>

                    
                      {#if info}
                        <div class="mt-2">
                          <ServerSelector
                            servers={serversList}
                            currentServer={currentServerName}
                            category={currentCategory}
                            changeServerManual={handleChangeServer}
                          />
                        </div>
                      {/if}

                    <!-- Gallery / Screenshots -->
                    {#if info?.galleryImages && info.galleryImages.length}
                      <div class="mt-3">
                        <h3 class="text-sm font-semibold text-[#ff003c] mb-2">Screenshots</h3>
                        <!-- Horizontal scroll strip for all sizes (desktop uses larger thumbnails) -->
                        <div class="flex gap-2 overflow-x-auto pb-2 flex-nowrap gallery-strip">
                          {#each info.galleryImages as img, i}
                            <img
                              src={img}
                              alt={`screenshot-${i}`}
                              class="h-20 md:h-28 rounded-md object-cover cursor-pointer border border-transparent hover:border-[#ff003c]/40 flex-shrink-0 inline-block w-auto"
                              on:click={() => window.open(img, '_blank')}
                              on:load={() => handleImageLoad(`gallery-${i}`)}
                              on:error={handleImageError}
                            />
                          {/each}
                        </div>
                      </div>
                    {/if}

            <!-- Info Card -->
            <div class="flex flex-col md:flex-row gap-8 bg-gradient-to-br from-[#1a0106] via-[#2a0008] to-[#3a0d16] rounded-lg shadow-2xl p-6 md:p-10 border border-[#ff003c]/20">
              <!-- Poster -->
              <div class="relative w-64 h-96 flex-shrink-0 mx-auto md:mx-0">
                {#if !imageLoadedStates[info.id]}
                  <div class="skeleton-loader rounded-lg shadow-2xl w-full h-full absolute inset-0 border-4 border-[#3a0d16]"></div>
                {/if}
                <img
                  src={poster}
                  alt={title}
                  class="rounded-lg shadow-2xl w-full h-full object-cover border-4 border-[#3a0d16] {imageLoadedStates[info.id] ? 'opacity-100' : 'opacity-0'}"
                  on:load={() => handleImageLoad(info.id)}
                  on:error={handleImageError}
                />
              </div>
              <!-- Details -->
              <div class="flex-1 space-y-3">
                <!-- Title -->
                <div class="flex items-center gap-2 sm:gap-3 md:ml-0 ml-[-8px]">
                  <h1 class="text-xl sm:text-3xl font-bold text-[#ff003c] {isMobile ? 'w-full text-center' : ''}">
                    {title}
                  </h1>
                </div>
                
                <div class="space-y-3">
                  <!-- Genres -->
                  {#if genres.length}
                    <div class="flex flex-wrap gap-1.5 md:ml-0 ml-[-8px]">
                      {#each (isMobile && !showAllGenres ? genres.slice(0, 3) : genres) as genre}
                        <a
                          href={`/hanime/genre/${genre.replace(/\s+/g, '-').toLowerCase()}`}
                          class="bg-[#ff003c]/20 text-[#ff003c] px-2 py-1 rounded text-xs font-medium hover:bg-[#ff003c]/30 transition"
                          style="text-decoration: none;"
                        >
                          {genre}
                        </a>
                      {/each}
                      {#if isMobile && genres.length > 3}
                        <button
                          class="text-[#ff003c] hover:text-[#c2002e] text-xs font-semibold"
                          on:click={() => (showAllGenres = !showAllGenres)}
                          style="background: none; border: none; cursor: pointer; padding: 0;"
                        >
                          {showAllGenres ? '- Less' : `+${genres.length - 3} More`}
                        </button>
                      {/if}
                    </div>
                  {/if}

                  <!-- Brand/Studio -->
                  {#if studio}
                    <div class="text-sm flex flex-wrap items-center gap-2 md:ml-0 ml-[-8px]">
                      <span class="text-[#ff003c] font-medium">Studio:</span>
                      <span class="text-[#ffb3c6] text-xs">
                        {studio}
                      </span>
                    </div>
                  {/if}
                  
                  <!-- Overview -->
                  <span class="text-[#ff003c] font-semibold block mb-1 md:ml-0 ml-[-8px]">Overview:</span>
                  {#if isMobile}
                    <div
                      class="text-[#ffb3c6] text-sm leading-tight md:ml-0 ml-[-8px]"
                      style="max-height: 220px; overflow-y: auto; line-height: 1.4;"
                    >
                      {description || 'No description available.'}
                    </div>
                  {:else if isLongDescription && !showFullDescription}
                    <div
                      class="text-[#ffb3c6] text-sm leading-tight md:ml-0 ml-[-8px]"
                      style="line-height: 1.4; position: relative;"
                    >
                      <span>{description?.slice(0, DESCRIPTION_LIMIT) || 'No description available.'}...</span>
                      <button
                        class="text-[#ff003c] hover:text-[#c2002e] text-xs font-semibold mt-1 block"
                        on:click={() => (showFullDescription = true)}
                        style="background: none; border: none; cursor: pointer; padding: 0; margin: 0;"
                      >
                        + More
                      </button>
                    </div>
                  {:else if isLongDescription && showFullDescription}
                    <div class="text-[#ffb3c6] text-sm leading-tight md:ml-0 ml-[-8px]" style="line-height: 1.4;">
                      <span>{description}</span>
                      <button
                        class="text-[#ff003c] hover:text-[#c2002e] text-xs font-semibold mt-1 block"
                        on:click={() => (showFullDescription = false)}
                        style="background: none; border: none; cursor: pointer; padding: 0; margin: 0;"
                      >
                        - Less
                      </button>
                    </div>
                  {:else}
                    <div class="text-[#ffb3c6] text-sm leading-tight md:ml-0 ml-[-8px]" style="line-height: 1.4;">
                      {description || 'No description available.'}
                    </div>
                  {/if}

                  <!-- Stats Grid -->
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
                    {#if airDate}
                      <div class="bg-[#ff003c]/10 p-2 rounded border border-[#ff003c]/20">
                        <span class="text-[#ff003c] font-medium block">Aired:</span>
                        <div class="text-[#ffb3c6]">{airDate}</div>
                      </div>
                    {/if}
                    {#if rating}
                       <div class="bg-[#ff003c]/10 p-2 rounded border border-[#ff003c]/20">
                        <span class="text-[#ff003c] font-medium block">Rating:</span>
                        <div class="text-[#ffb3c6]">{rating}/10</div>
                      </div>
                    {/if}
                    {#if ratingCount}
                      <div class="bg-[#ff003c]/10 p-2 rounded border border-[#ff003c]/20 col-span-2 sm:col-span-1">
                        <span class="text-[#ff003c] font-medium block">Votes:</span>
                        <div class="text-[#ffb3c6]">{ratingCount}</div>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>

          </section>

          <!-- Related Episodes Section -->
          {#if relatedEpisodes.length}
            <section class="flex flex-col gap-4 mt-2">
              <h2 class="text-2xl font-bold text-[#ff003c] mb-4">Related Episodes</h2>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                {#each relatedEpisodes as ep, idx}
                  <a
                    href={`/hanime/watch/${ep.slug}`}
                    class="group relative bg-[#1a0106] rounded-lg overflow-hidden shadow-lg transition-all duration-200 border border-[#ff003c]/20 hover:border-[#ff003c]/60 hover:shadow-[#ff003c]/30 cursor-pointer hover:scale-[1.02]"
                  >
                    <div class="relative aspect-video">
                      {#if !imageLoadedStates[ep.slug]}
                        <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                      {/if}
                      <img
                        src={ep.imageUrl}
                        alt={ep.title}
                        class="w-full h-full object-cover {imageLoadedStates[ep.slug] ? 'opacity-100' : 'opacity-0'}"
                        loading={idx < 6 ? 'eager' : 'lazy'}
                        on:load={() => handleImageLoad(ep.slug)}
                        on:error={handleImageError}
                      />
                      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                      <div class="absolute bottom-0 left-0 right-0 p-2">
                        <h3 class="font-semibold text-white text-xs mb-0.5 line-clamp-1 group-hover:text-[#ffb3c6] transition-colors" title={ep.title}>
                          {ep.title}
                        </h3>
                        <span class="text-[#ffb3c6] text-[10px]">{ep.releaseDate}</span>
                      </div>
                    </div>
                  </a>
                {/each}
              </div>
            </section>
          {/if}

          <!-- Similar Series Section -->
          {#if similarSeries.length}
            <section class="flex flex-col gap-4 mt-2">
              <h2 class="text-xl font-bold text-[#ff003c] mb-2">Similar Series</h2>
              <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 md:gap-3">
                {#each similarSeries as series, idx}
                  <a
                    href={`/hanime/info/${series.slug}`}
                    class="group relative bg-[#1a0106] rounded-sm overflow-hidden shadow transition-all duration-150 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40 cursor-pointer"
                  >
                    <div class="relative aspect-[3/4]">
                      {#if !imageLoadedStates[series.slug]}
                        <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                      {/if}
                      <img
                        src={series.imageUrl}
                        alt={series.title}
                        class="w-full h-full object-cover {imageLoadedStates[series.slug] ? 'opacity-100' : 'opacity-0'}"
                        loading={idx < 6 ? 'eager' : 'lazy'}
                        on:load={() => handleImageLoad(series.slug)}
                        on:error={handleImageError}
                      />
                      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div class="absolute top-2 left-2">
                        <span class="bg-[#ff003c] text-white px-2 py-0.5 rounded-sm text-[10px] font-semibold shadow">
                          Series
                        </span>
                      </div>
                      <div class="absolute bottom-0 left-0 right-0 p-2">
                        <h3 class="font-semibold text-white text-xs mb-1 line-clamp-2 group-hover:text-[#ffb3c6] transition-colors" title={series.title}>
                          {series.title}
                        </h3>
                      </div>
                    </div>
                  </a>
                {/each}
              </div>
            </section>
          {/if}
        {:else}
          <!-- Error State -->
          <section class="flex flex-col items-center justify-center py-24">
            <div class="relative mb-6">
              <div class="absolute -inset-1 bg-gradient-to-r from-[#ff003c] to-[#ff4d79] rounded-full blur opacity-20"></div>
              <div class="relative bg-[#2a0008]/80 backdrop-blur-sm rounded-full p-8 border border-[#ff003c]/30 inline-block">
                <svg class="w-16 h-16 text-[#ff003c] mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
              </div>
            </div>
            <h2 class="text-2xl font-bold text-[#ff003c] mt-6 mb-2">Video Not Found</h2>
            <p class="text-[#ffb3c6]/80">The requested video could not be loaded or does not exist.</p>
          </section>
        {/if}
      {/if}
    </div>
  </main>
  <div class="h-4 sm:h-6"></div>
  <Footer />
</div>

<style>
  /* Mobile player - full width with no side padding */
  @media (max-width: 768px) {
    .player-card-mobile {
      margin-left: -0.625rem;
      margin-right: -0.625rem;
      border-radius: 0;
      padding: 0.375rem !important;
    }
  }

  @media (max-width: 768px) {
    .flex-shrink-0 {
      margin-left: auto;
      margin-right: auto;
    }
  }
  
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Add responsive container widths */
  @media (min-width: 1920px) {
    .max-w-\[1920px\] {
      max-width: 90vw;
    }
  }

  /* Skeleton Loader - plain background for performance */
  .skeleton-loader {
    background-color: #3a0d16;
  }

  img {
    transition: opacity 0.3s ease-in-out;
  }

  /* Gallery strip improvements: keep thumbnails in a horizontal scroll on desktop */
  .gallery-strip {
    -webkit-overflow-scrolling: touch;
  }
  .gallery-strip img {
    display: inline-block;
  }
</style>