<script lang="ts">
  import Navbar from '$lib/components/hanime/Navbar.svelte';
  import Footer from '$lib/components/hanime/Footer.svelte';
  import AdultWarning from '$lib/components/hanime/AdultWarning.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  export let data: any;

  $: info = data?.info?.results;
  $: related = info?.related ?? [];

  let loading = false;
  let showWarning = true;
  let showFullDescription = false;
  let isLongDescription = false;
  let isMobile = false;
  const DESCRIPTION_LIMIT = 450;
  let showAllGenres = false;

  // Cookie helpers
  function getCookie(name: string) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }
  function setCookie(name: string, value: string, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  }

  // Check for 18+ on mount
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

  async function handleRelatedClick(id: string) {
    loading = true;
    try {
      await goto(`/hanime/info/${id}`);
    } finally {
      loading = false;
    }
  }

  function updateIsMobile() {
    if (typeof window !== 'undefined') {
      isMobile = window.innerWidth <= 768;
    }
  }

  function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset.errorHandled) {
      img.dataset.errorHandled = 'true';
      img.src = '/assets/placeholder-anime.jpg';
      img.onerror = null;
    }
  }

  function safeTruncate(str: string | undefined | null, maxLength: number = 100): string {
    if (!str || typeof str !== 'string') return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }

  onMount(() => {
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    if (info?.description && info.description.length > DESCRIPTION_LIMIT) {
      isLongDescription = true;
    }
    return () => {
      window.removeEventListener('resize', updateIsMobile);
    };
  });
</script>

<svelte:head>
  <title>{info?.name || 'ARMS Hentai'} | ARMS Hentai</title>
  <meta name="description" content={info?.description || 'Hanime information page'}>
  <meta property="og:title" content={info?.name || 'Hanime Info'}>
  <meta property="og:description" content={info?.description || 'Hanime information page'}>
  <meta property="og:url" content={info ? `/hanime/info/${info.id}` : ''}>
</svelte:head>

<Navbar />

{#if showWarning}
  <AdultWarning onConfirm={closeWarning} onReject={rejectWarning} />
{/if}

<div class="flex flex-col min-h-screen bg-gradient-to-b from-[#2a0008] via-[#3a0d16] to-[#1a0106] text-white pt-16">
  {#if loading}
    <div class="flex items-center justify-center min-h-[60vh] w-full">
      <img
        src="/assets/loader.gif"
        alt="Loading..."
        class="object-contain"
        style="max-width: 120px; max-height: 110px; aspect-ratio: 1 / 1;"
      />
    </div>
  {:else}
    <div class="flex-1 w-full">
      <div class="max-w-7xl mx-auto flex flex-col gap-8 px-2 sm:px-6">
        {#if info}
          <!-- Main Content -->
          <div class="flex-1 flex flex-col gap-8 mb-12">
            <section class="flex-1 flex flex-col gap-8">
              <!-- Modern Info Card -->
              <div class="flex flex-col md:flex-row gap-8 bg-gradient-to-br from-[#2a0008] via-[#3a0d16] to-[#1a0106] rounded-lg shadow-2xl p-6 md:p-10 border border-[#ff003c]/20">
                <!-- Poster -->
                <div class="flex flex-col items-center md:items-start flex-shrink-0 mx-auto md:mx-0">
                  <img
                    src={info.poster}
                    alt={info.name}
                    class="rounded-lg shadow-2xl w-64 h-auto object-cover border-4 border-[#3a0d16]"
                    on:error={handleImageError}
                  />
                </div>
                
                <!-- Details -->
                <div class="flex-1 space-y-3">
                  <!-- Title -->
                  <div class="flex items-center gap-2 sm:gap-3 md:ml-0 ml-[-8px]">
                    <h1 class="text-xl sm:text-3xl font-bold text-[#ff003c] 
                      {isMobile ? 'w-full text-center' : ''}">
                      {info.name}
                    </h1>
                  </div>

                  <div class="space-y-3">
                    <!-- Genres -->
                    <div class="flex flex-wrap gap-1.5 md:ml-0 ml-[-8px]">
                      {#each (isMobile && !showAllGenres ? info.genre.slice(0, 3) : info.genre) as genre}
                        <a
                          href={`/hanime/genre/${genre.replace(/\s+/g, '-').toLowerCase()}`}
                          class="bg-[#ff003c]/20 text-[#ff003c] px-2 py-1 rounded text-xs font-medium hover:bg-[#ff003c]/30 transition"
                          style="text-decoration: none;"
                        >
                          {genre}
                        </a>
                      {/each}
                      {#if isMobile && info.genre.length > 3}
                        <button
                          class="text-[#ff003c] hover:text-[#c2002e] text-xs font-semibold"
                          on:click={() => (showAllGenres = !showAllGenres)}
                          style="background: none; border: none; cursor: pointer; padding: 0;"
                        >
                          {showAllGenres ? '- Less' : `+${info.genre.length - 3} More`}
                        </button>
                      {/if}
                    </div>

                    <!-- Brand/Studio -->
                    {#if info.brandName}
                      <div class="text-sm flex flex-wrap items-center gap-2 md:ml-0 ml-[-8px]">
                        <span class="text-[#ff003c] font-medium">Studio:</span>
                        <span
                          class="text-[#ffb3c6] text-xs cursor-pointer hover:text-[#ff003c] transition"
                          style="text-decoration: none;"
                          on:click={() => goto(`/hanime/studio/${encodeURIComponent(info.brandName.replace(/\s+/g, '-').toLowerCase())}`)}
                        >
                          {info.brandName}
                        </span>
                      </div>
                    {/if}

                    <!-- Description -->
                    <span class="text-[#ff003c] font-semibold block mb-1 md:ml-0 ml-[-8px]">Overview:</span>
                    {#if isMobile}
                      <div
                        class="text-[#ffb3c6] text-sm leading-tight md:ml-0 ml-[-8px]"
                        style="max-height: 220px; overflow-y: auto; line-height: 1.4;"
                      >
                        {info.description || 'No description available.'}
                      </div>
                    {:else if isLongDescription && !showFullDescription}
                      <div
                        class="text-[#ffb3c6] text-sm leading-tight md:ml-0 ml-[-8px]"
                        style="line-height: 1.4; position: relative;"
                      >
                        <span>
                          {info.description?.slice(0, DESCRIPTION_LIMIT) || 'No description available.'}...
                        </span>
                        <button
                          class="text-[#ff003c] hover:text-[#c2002e] text-xs font-semibold mt-1 block"
                          on:click={() => showFullDescription = true}
                          style="background: none; border: none; cursor: pointer; padding: 0; margin: 0;"
                        >
                          + More
                        </button>
                      </div>
                    {:else if isLongDescription && showFullDescription}
                      <div
                        class="text-[#ffb3c6] text-sm leading-tight md:ml-0 ml-[-8px]"
                        style="line-height: 1.4;"
                      >
                        <span>
                          {info.description}
                        </span>
                        <button
                          class="text-[#ff003c] hover:text-[#c2002e] text-xs font-semibold mt-1 block"
                          on:click={() => showFullDescription = false}
                          style="background: none; border: none; cursor: pointer; padding: 0; margin: 0;"
                        >
                          - Less
                        </button>
                      </div>
                    {:else}
                      <div
                        class="text-[#ffb3c6] text-sm leading-tight md:ml-0 ml-[-8px]"
                        style="line-height: 1.4;"
                      >
                        {info.description || 'No description available.'}
                      </div>
                    {/if}

                    <!-- Watch Button -->
                    {#if isMobile}
                      <div class="flex justify-center py-2">
                        <a
                          href={`/hanime/watch/${info.id}`}
                          class="inline-flex items-center justify-center gap-2 bg-[#ff003c] hover:bg-[#c2002e] text-white font-bold px-12 py-2 rounded-lg shadow transition text-sm"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 20 20">
                            <rect x="1" y="1" width="18" height="18" rx="4" stroke="currentColor" fill="none" />
                            <polygon points="8,6 14,10 8,14" fill="currentColor" />
                          </svg>
                          <span class="tracking-wide font-semibold">Watch</span>
                        </a>
                      </div>
                    {:else}
                      <a
                        href={`/hanime/watch/${info.id}`}
                        class="inline-flex items-center gap-2 bg-[#ff003c] hover:bg-[#c2002e] text-white font-bold px-5 py-2 rounded-lg shadow transition text-sm md:ml-0 ml-[-8px]"
                        style="margin-bottom: 0.5rem;"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 20 20">
                          <rect x="1" y="1" width="18" height="18" rx="4" stroke="currentColor" fill="none" />
                          <polygon points="8,6 14,10 8,14" fill="currentColor" />
                        </svg>
                        <span class="tracking-wide font-semibold">Watch</span>
                      </a>
                    {/if}

                    <!-- Stats Grid -->
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
                      {#if info.releaseDate}
                        <div class="bg-[#ff003c]/10 p-2 rounded border border-[#ff003c]/20">
                          <span class="text-[#ff003c] font-medium block">Released:</span>
                          <div class="text-[#ffb3c6]">{info.releaseDate}</div>
                        </div>
                      {/if}
                      {#if info.uploadDate}
                        <div class="bg-[#ff003c]/10 p-2 rounded border border-[#ff003c]/20">
                          <span class="text-[#ff003c] font-medium block">Uploaded:</span>
                          <div class="text-[#ffb3c6]">{info.uploadDate}</div>
                        </div>
                      {/if}
                      {#if info.views}
                        <div class="bg-[#ff003c]/10 p-2 rounded border border-[#ff003c]/20 col-span-2 sm:col-span-1">
                          <span class="text-[#ff003c] font-medium block">Views:</span>
                          <div class="text-[#ffb3c6]">{info.views}</div>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Related Hanime with Modern Landscape Design -->
              {#if related.length}
                <section>
                  <h2 class="text-2xl font-bold text-[#ff003c] mb-4">Related Titles</h2>
                  <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                    {#each related as rel}
                      <a
                        href={`/hanime/info/${rel.id}`}
                        on:click|preventDefault={() => handleRelatedClick(rel.id)}
                        class="group relative bg-gradient-to-br from-[#2a0008] via-[#3a0d16] to-[#1a0106] rounded-md overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40 cursor-pointer block hover:scale-[1.03]"
                        style="min-height: 120px;"
                      >
                        <div class="relative aspect-[16/7] w-full">
                          <img 
                            src={rel.image} 
                            alt={safeTruncate(rel.title, 50)} 
                            class="w-full h-full object-cover rounded-none"
                            style="aspect-ratio: 16/7;"
                            loading="lazy"
                            on:error={handleImageError}
                          />
                          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        </div>
                        <div class="absolute bottom-0 left-0 right-0 p-2">
                          <h3 class="font-semibold text-white text-xs mb-0.5 truncate group-hover:text-[#ffb3c6] transition-colors" title={rel.title}>
                            {safeTruncate(rel.title, 60)}
                          </h3>
                          <div class="flex flex-wrap gap-1">
                            <span class="bg-[#ff003c] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                              Hanime
                            </span>
                            {#if rel.views}
                              <span class="bg-[#2a0008] text-[#ffb3c6] px-1.5 py-0.5 rounded text-[10px]">
                                {rel.views} views
                              </span>
                            {/if}
                          </div>
                        </div>
                      </a>
                    {/each}
                  </div>
                </section>
              {/if}
            </section>
          </div>
        {:else}
          <div class="text-center text-[#ff003c]">Info not found or failed to load.</div>
        {/if}
      </div>
    </div>
  {/if}

  <Footer />
</div>

<style>
  .loader-adult {
    border: 6px solid #ff003c33;
    border-top: 6px solid #ff003c;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }
  @keyframes spin {
    0% { transform: rotate(0deg);}
    100% { transform: rotate(360deg);}
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
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>