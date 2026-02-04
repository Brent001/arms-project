<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Navbar from '$lib/components/hanime/Navbar.svelte';
  import Footer from '$lib/components/hanime/Footer.svelte';

  export let data: any;

  let isMobile = false;
  let imageLoadedStates: { [key: string]: boolean } = {};
  let isNavigating = false;

  // Mobile detection
  function checkMobile() {
    if (typeof window !== 'undefined') {
      isMobile = window.innerWidth < 768;
    }
  }

  onMount(() => {
    checkMobile();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        checkMobile();
      }, 150);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  function handleImageLoad(id: string) {
    imageLoadedStates = { ...imageLoadedStates, [id]: true };
  }

  async function loadPage(newPage: number) {
    if (isNavigating) return;
    
    isNavigating = true;
    const newUrl = new URL($page.url);
    
    if (newPage === 1) {
      newUrl.searchParams.delete('page');
    } else {
      newUrl.searchParams.set('page', newPage.toString());
    }
    
    await goto(newUrl.toString(), { replaceState: true });
    isNavigating = false;
    
    // Scroll to top
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  $: currentPage = data?.pagination?.currentPage || 1;
  $: totalPages = data?.pagination?.totalPages || 1;
  $: hasNextPage = data?.pagination?.hasNextPage || false;
  $: hasPreviousPage = data?.pagination?.hasPreviousPage || false;
  
  const pagesPerGroup = 3;
  $: startPage = Math.max(1, currentPage - Math.floor(pagesPerGroup / 2));
  $: endPage = Math.min(totalPages, startPage + pagesPerGroup - 1);
  $: pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
</script>

<svelte:head>
  <title>Recent Episodes | ARMS Hentai</title>
  <meta name="description" content="Latest hentai episodes released. New content updated daily." />
</svelte:head>

<Navbar />

<div class="flex flex-col min-h-screen bg-gradient-to-br from-[#2a0008] via-[#3a0d16] to-[#1a0106] text-white">
  <div class="flex-1 w-full pt-16">
    <div class="container-custom">
      <!-- Page Header -->
      <section class="mb-8">
        <div class="flex items-center gap-2 sm:gap-3 mb-6">
          <div class="w-1 h-7 sm:h-8 bg-[#ff003c] rounded-full flex-shrink-0"></div>
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Recent Episodes</h1>
        </div>
        <p class="text-[#ffb3c6] text-sm sm:text-base">Latest hentai episodes released daily</p>
      </section>

      <!-- Episodes Grid -->
      <section class="mb-8">
        {#if data?.episodes && data.episodes.length > 0}
          <div class="grid-responsive">
            {#each data.episodes as episode, index}
              <a
                href={`/hanime/watch/${episode.slug}`}
                class="group relative bg-[#1a0106] rounded-xl overflow-hidden shadow {isMobile ? 'border border-transparent' : 'transition-all duration-150 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40'} cursor-pointer block"
              >
                <div class="relative aspect-[16/9]">
                  {#if !imageLoadedStates[episode.slug]}
                    <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                  {/if}
                  <img
                    src={episode.posterUrl}
                    alt={episode.seriesTitle}
                    class="w-full h-full object-cover {imageLoadedStates[episode.slug] ? 'opacity-100' : 'opacity-0'}"
                    loading={index < (isMobile ? 6 : 12) ? 'eager' : 'lazy'}
                    decoding="async"
                    on:load={() => handleImageLoad(episode.slug)}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent"></div>
                  <div class="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
                    <span class="bg-[#ff003c] text-white px-2 py-0.5 rounded text-[10px] font-semibold shadow">
                      NEW
                    </span>
                    {#if episode.rating}
                      <span class="bg-black/70 {isMobile ? '' : 'backdrop-blur-sm'} text-[#ffb3c6] px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {episode.rating}
                      </span>
                    {/if}
                  </div>
                  <div class="absolute bottom-0 left-0 right-0 p-2">
                    <h3 class="text-white font-semibold text-sm line-clamp-2 drop-shadow-lg">{episode.seriesTitle}</h3>
                    <p class="text-[#ffb3c6] text-xs drop-shadow">{episode.episodeTitle}</p>
                    {#if episode.releaseDate}
                      <p class="text-[#d4899f] text-xs mt-1 drop-shadow">{episode.releaseDate}</p>
                    {/if}
                  </div>
                </div>
              </a>
            {/each}
          </div>
        {:else}
          <div class="bg-[#2a0008] rounded-2xl overflow-hidden shadow-xl border border-[#ff003c]/20 px-4 py-12 sm:px-8 sm:py-16">
            <div class="flex items-center justify-center text-[#ffb3c6] text-center">
              <div>
                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p class="text-lg font-semibold">No episodes found</p>
              </div>
            </div>
          </div>
        {/if}
      </section>

      <!-- Pagination -->
      {#if totalPages > 1}
        <section class="flex justify-center items-center mt-6 gap-1 sm:gap-2 flex-wrap mb-8 pagination">
          {#if currentPage > 1}
            <button
              class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-[#1a0106] text-white hover:bg-[#ff003c] hover:text-white transition disabled:opacity-50 pagination-btn"
              on:click={() => loadPage(1)}
              disabled={isNavigating}
              aria-label="First page"
            >
              <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-none stroke-current" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
              </svg>
            </button>
            <button
              class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-[#1a0106] text-white hover:bg-[#ff003c] hover:text-white transition disabled:opacity-50 pagination-btn"
              on:click={() => loadPage(currentPage - 1)}
              disabled={isNavigating}
              aria-label="Previous page"
            >
              <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-none stroke-current" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          {/if}

          {#each pageNumbers as pageNum}
            <button
              class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-xs sm:text-sm transition disabled:opacity-50 pagination-btn
                {currentPage === pageNum
                  ? 'bg-[#ff003c] text-white'
                  : 'bg-[#1a0106] text-white hover:bg-[#ff003c]/50'}"
              on:click={() => loadPage(pageNum)}
              disabled={isNavigating}
              aria-label={`Page ${pageNum}`}
              aria-current={currentPage === pageNum ? 'page' : undefined}
            >
              {pageNum}
            </button>
          {/each}

          {#if currentPage < totalPages}
            <button
              class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-[#1a0106] text-white hover:bg-[#ff003c] hover:text-white transition disabled:opacity-50 pagination-btn"
              on:click={() => loadPage(currentPage + 1)}
              disabled={isNavigating}
              aria-label="Next page"
            >
              <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-none stroke-current" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <button
              class="w-10 h-9 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg font-bold text-sm bg-[#1a0106] text-white hover:bg-[#ff003c] hover:text-white transition disabled:opacity-50 pagination-btn"
              on:click={() => loadPage(totalPages)}
              disabled={isNavigating}
              aria-label="Last page"
            >
              <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-none stroke-current" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 17l5-5-5-5M6 17l5-5-5-5" />
              </svg>
            </button>
          {/if}
        </section>
      {:else}
        <!-- Add spacing when pagination is hidden -->
        <div class="h-8 mb-8"></div>
      {/if}
    </div>
  </div>

  <Footer />
</div>

<style>
  /* ─── Layout container ─── */
  .container-custom {
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    padding-left: 0.25rem;
    padding-right: 0.25rem;
  }

  @media (min-width: 640px) {
    .container-custom {
      padding-left: 0.75rem;
      padding-right: 0.75rem;
    }
  }

  @media (min-width: 1024px) {
    .container-custom {
      max-width: 1280px;
      padding-left: 1rem;
      padding-right: 1rem;
    }
  }

  @media (min-width: 1280px) {
    .container-custom {
      max-width: 1536px;
      padding-left: 1rem;
      padding-right: 1rem;
    }
  }

  @media (min-width: 1536px) {
    .container-custom {
      max-width: 1792px;
      padding-left: 1rem;
      padding-right: 1rem;
    }
  }

  @media (min-width: 1920px) {
    .container-custom {
      max-width: 1920px;
      padding-left: 1rem;
      padding-right: 1rem;
    }
  }

  /* ─── Generic responsive grid ─── */
  .grid-responsive {
    display: grid;
    gap: 0.25rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 640px) {
    .grid-responsive {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.25rem;
    }
  }

  @media (min-width: 768px) {
    .grid-responsive {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.25rem;
    }
  }

  @media (min-width: 1024px) {
    .grid-responsive {
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.25rem;
    }
  }

  @media (min-width: 1280px) {
    .grid-responsive {
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 0.25rem;
    }
  }

  @media (min-width: 1536px) {
    .grid-responsive {
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 0.25rem;
    }
  }

  @media (min-width: 1920px) {
    .grid-responsive {
      grid-template-columns: repeat(8, minmax(0, 1fr));
      gap: 0.25rem;
    }
  }

  /* ─── Skeleton & image fade ─── */
  .skeleton-loader {
    background-color: #3a0d16;
  }

  img {
    transition: opacity 0.3s ease-in-out;
  }

  /* ─── Utilities ─── */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-clamp: 2;
  }

  /* ─── Pagination button optimization ─── */
  .pagination-btn {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
  }

  .pagination-btn:active {
    transform: scale(0.95) translateZ(0);
  }

  /* ─── Pagination layout ─── */
  .pagination {
    contain: layout style;
  }

  /* ─── Desktop card hover ─── */
  @media (min-width: 768px) {
    .group {
      border: 2px solid transparent;
      transition: border-color 0.3s, box-shadow 0.3s;
    }
    .group:hover {
      border-color: #ff003c;
      box-shadow: 0 0 0 2px #ff003c44, 0 4px 24px #ff003c22;
    }

    @supports (backdrop-filter: blur(10px)) {
      .backdrop-blur-sm {
        backdrop-filter: blur(4px);
      }
    }
  }
</style>