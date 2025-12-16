<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Navbar from '$lib/components/hanime/Navbar.svelte';
  import Footer from '$lib/components/hanime/Footer.svelte';
  import AdultWarning from '$lib/components/hanime/AdultWarning.svelte';
  import type { PageData } from './$types.js';

  // Extend PageData to include relatedSeries
  type ExtendedPageData = PageData & {
    manga: {
      id: string;
      title: string;
      description?: string;
      excerpt?: string;
      status: string;
      type: string;
      author?: string;
      artist?: string;
      datePublished?: string;
      modifiedDate?: string;
      featuredImageUrl: string;
      genres: Array<{ name: string; slug: string } | string>;
      chapters: Array<{ number: string; title: string; date: string; slug: string }>;
      totalChapters?: number;
      relatedSeries?: Array<{
        title: string;
        slug: string;
        featuredImageUrl: string;
        latestChapter?: number;
      }>;
    };
    chapters: Array<{ number: string; title: string; date: string; slug: string }>;
    totalChapters: number;
    relatedSeries: Array<{
        title: string;
        slug: string;
        featuredImageUrl: string;
        latestChapter?: number;
      }>;
  };

  export let data: ExtendedPageData;

  $: manga = data.manga;
  $: chapters = data.chapters;
  $: totalChapters = data.totalChapters;
  $: relatedSeries = data.relatedSeries; // New: Reactive assignment for related series

  let showWarning = true;
  let isMobile = false;
  let imageLoadedStates: { [key: string]: boolean } = {};
  let showFullDescription = false;
  let isLongDescription = false;
  let showAllGenres = false;
  let chapterPage = 0;

  const DESCRIPTION_LIMIT = 450;
  const CHAPTERS_PER_PAGE = 20;

  $: totalChapterPages = Math.ceil(chapters.length / CHAPTERS_PER_PAGE);
  $: pagedChapters = chapters.slice(
    chapterPage * CHAPTERS_PER_PAGE,
    (chapterPage + 1) * CHAPTERS_PER_PAGE
  );

  // Custom dropdown state
  let showChapterDropdown = false;

  // Helper to get cookie value
  function getCookie(name: string) {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  // Helper to set cookie
  function setCookie(name: string, value: string, days = 365) {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
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

  function checkAge() {
    if (typeof window === 'undefined') return;
    const cookieCheck = getCookie('arms18plus') === 'yes';
    const storageCheck = typeof localStorage !== 'undefined' && localStorage.getItem('arms18plus') === 'yes';
    showWarning = !(cookieCheck || storageCheck);
  }

  function updateIsMobile() {
    if (typeof window !== 'undefined') {
      isMobile = window.innerWidth <= 768;
    }
  }

  function handleImageLoad(id: string) {
    imageLoadedStates = { ...imageLoadedStates, [id]: true };
  }

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

  function setChapterPage(page: number) {
    chapterPage = page;
    showChapterDropdown = false;
  }

  function handleClickOutside(event: MouseEvent) {
    if (showChapterDropdown && event.target && !document.getElementById('chapter-menu-button')?.contains(event.target as Node) && !(event.target as HTMLElement).closest('[role="chapter-menu"]')) {
      showChapterDropdown = false;
    }
  }

  onMount(() => {
    checkAge();
    updateIsMobile();

    if (manga?.description && manga.description.length > DESCRIPTION_LIMIT) {
      isLongDescription = true;
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateIsMobile, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', handleClickOutside);
    };
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      document.removeEventListener('click', handleClickOutside);
    }
  });
</script>

<svelte:head>
  <title>{manga?.title} | ARMS Manga 18+</title>
  <meta name="description" content={manga?.description || 'Discover this manga on ARMS.'}>
  <meta property="og:title" content={manga?.title}>
  <meta property="og:description" content={manga?.description || 'Adult manga content'}>
  <meta property="og:image" content={manga?.featuredImageUrl}>
  <meta property="og:type" content="website">
  <meta property="og:url" content={`https://arms-anime.com/hanime/manga/info/${manga?.slug || ''}`}>
</svelte:head>

<Navbar />

{#if showWarning}
  <AdultWarning onConfirm={closeWarning} onReject={rejectWarning} />
{/if}

<div class="flex flex-col min-h-screen bg-gradient-to-br from-[#2a0008] via-[#3a0d16] to-[#1a0106] text-white pt-16">
  {#if !manga}
    <div class="flex items-center justify-center flex-1">
      <img
        src="/assets/loader.gif"
        alt="Loading..."
        class="object-contain"
        style="max-width: 120px; max-height: 110px; aspect-ratio: 1 / 1;"
        on:error={handleImageError}
      />
    </div>
  {:else}
    <div class="flex-1 w-full">
      <div class="max-w-[125rem] mx-auto flex flex-col gap-6 sm:gap-10 px-1 sm:px-6">
        <!-- Main Info Card -->
        <section class="flex-1 flex flex-col gap-8 mb-5">
          <div class="flex flex-col md:flex-row gap-4 md:gap-8 bg-gradient-to-br from-[#2a0008] via-[#3a0d16] to-[#1a0106] rounded-lg shadow-2xl p-6 md:p-10 border border-[#ff003c]/20">
            <!-- Poster -->
            <div class="flex flex-col items-center md:items-start flex-shrink-0 mx-auto md:mx-0">
              <div class="relative w-64 aspect-[3/4] rounded-lg border-4 border-[#ff003c]/20 overflow-hidden bg-[#1a0106]">
                {#if !imageLoadedStates[`main-${manga.slug}`]}
                  <div class="skeleton-loader absolute inset-0"></div>
                {/if}
                <img
                  src={manga.featuredImageUrl}
                  alt={manga.title}
                  class="shadow-2xl w-full h-full object-cover {imageLoadedStates[`main-${manga.slug}`] ? 'opacity-100' : 'opacity-0'}"
                  on:error={handleImageError}
                  on:load={() => handleImageLoad(`main-${manga.slug}`)}
                />
                <!-- 18+ badge moved into poster (top-right) -->
                <span class="absolute top-2 right-2 bg-[#ff003c] text-white px-3 py-1 rounded-full text-sm font-bold z-10">
                  18+
                </span>
              </div>
            </div>

            <!-- Details -->
            <div class="flex-1 space-y-3">
              <div class="flex items-center gap-2 sm:gap-3 md:ml-0 ml-[-8px]">
                <h1 class="text-xl sm:text-3xl font-bold text-[#ff003c] {isMobile ? 'w-full text-center' : ''}">
                  {manga.title}
                </h1>
              </div>

              <div class="space-y-3">
                <!-- Genres -->
                {#if manga.genres && manga.genres.length > 0}
                  <div class="flex flex-wrap items-center gap-1.5 md:ml-0 ml-[-8px]">
                    {#each (isMobile && !showAllGenres ? manga.genres.slice(0, 3) : manga.genres) as genre}
                      <a 
                        href={`/hanime/manga/genre/${encodeURIComponent(typeof genre === 'object' ? genre.slug : genre.toLowerCase().replace(/\s+/g, '-'))}`}
                        class="bg-[#ff003c]/20 text-[#ffb3c6] px-2 py-1 rounded text-xs font-medium hover:bg-[#ff003c] hover:text-white transition-colors"
                      >
                        {typeof genre === 'object' ? genre.name : genre}
                      </a>
                    {/each}
                    {#if isMobile && manga.genres.length > 3}
                      <button
                        class="text-[#ff003c] hover:text-[#ffb3c6] text-xs font-semibold"
                        on:click={() => (showAllGenres = !showAllGenres)}
                        style="background: none; border: none; cursor: pointer; padding: 0;"
                        aria-expanded={showAllGenres}
                        aria-controls="genre-list"
                      >
                        {showAllGenres ? '- Less' : `+${manga.genres.length - 3} More`}
                      </button>
                    {/if}
                  </div>
                {/if}

                <!-- Description -->
                <div>
                  <span class="text-[#ff003c] font-semibold block mb-1 md:ml-0 ml-[-8px]">Overview:</span>
                  {#if isMobile}
                    <div
                      class="text-[#ffb3c6] text-sm leading-tight md:ml-0 ml-[-8px]"
                      style="max-height: 220px; overflow-y: auto; line-height: 1.4;"
                    >
                      {manga.description || manga.excerpt || 'No description available.'}
                    </div>
                  {:else if isLongDescription && !showFullDescription}
                    <div
                      class="text-[#ffb3c6] text-sm leading-tight md:ml-0 ml-[-8px]"
                      style="line-height: 1.4; position: relative;"
                    >
                      <span>
                        {safeTruncate(manga.description, DESCRIPTION_LIMIT)}
                      </span>
                      <button
                        class="text-[#ff003c] cursor-pointer text-sm font-semibold ml-1 hover:text-white"
                        on:click={() => (showFullDescription = true)}
                        aria-expanded={showFullDescription}
                        aria-controls="manga-description"
                        style="background: none; border: none; cursor: pointer; padding: 0; margin: 0;"
                      >
                        ...more
                      </button>
                    </div>
                  {:else if isLongDescription && showFullDescription}
                    <div
                      class="text-[#ffb3c6] text-sm leading-tight md:ml-0 ml-[-8px]"
                      style="line-height: 1.4;"
                    >
                      <span>
                        {manga.description}
                      </span>
                      <button
                        class="text-[#ff003c] cursor-pointer text-sm font-semibold ml-1 hover:text-white"
                        on:click={() => (showFullDescription = false)}
                        aria-expanded={showFullDescription}
                        aria-controls="manga-description"
                        style="background: none; border: none; cursor: pointer; padding: 0; margin: 0;"
                      >
                        ...less
                      </button>
                    </div>
                  {:else}
                    <div
                      class="text-[#ffb3c6] text-sm leading-tight md:ml-0 ml-[-8px]"
                      style="line-height: 1.4;"
                    >
                      {manga.description || manga.excerpt || 'No description available.'}
                    </div>
                  {/if}
                </div>

                <!-- Status and Info -->
                <div class="flex flex-wrap gap-2 mb-2">
                  {#if manga.status}
                    <span class="bg-[#ff003c] text-white px-2 py-0.5 rounded-full text-xs font-bold">
                      {manga.status}
                    </span>
                  {/if}
                  {#if manga.type}
                    <span class="bg-[#ff003c]/20 text-[#ffb3c6] px-2 py-0.5 rounded-full text-xs">
                      {manga.type}
                    </span>
                  {/if}
                  {#if totalChapters}
                    <span class="bg-[#ff003c]/20 text-[#ffb3c6] px-2 py-0.5 rounded-full text-xs">
                      {totalChapters} Chapters
                    </span>
                  {/if}
                </div>
              </div>
            </div>
          </div>

          <!-- Chapters Section -->
          <section class="mb-1">
            <div class="flex items-center gap-2 mb-4 flex-wrap">
              <div class="flex items-center gap-3">
                <div class="w-1 h-8 bg-[#ff003c] rounded-full"></div>
                <h2 class="text-2xl font-bold text-white">Chapters</h2>
                <span class="bg-[#ff003c]/20 text-[#ff003c] px-3 py-1 rounded-full text-sm font-medium">
                  {chapters.length} items
                </span>
              </div>

              {#if totalChapterPages > 1}
                <!-- Chapter Pagination Dropdown (anchored to button, mobile-friendly) -->
                <div class="relative inline-block text-left z-10">
                  <div>
                    <button
                      type="button"
                      id="chapter-menu-button"
                      class="inline-flex justify-center items-center rounded-lg border border-[#ff003c]/40 shadow-sm px-3 py-2 bg-[#1a0106] text-sm font-medium text-[#ff003c] hover:bg-[#2a0008] focus:outline-none transition whitespace-nowrap"
                      aria-expanded={showChapterDropdown}
                      aria-haspopup="true"
                      on:click={() => (showChapterDropdown = !showChapterDropdown)}
                    >
                      Page {chapterPage * CHAPTERS_PER_PAGE + 1}-{Math.min((chapterPage + 1) * CHAPTERS_PER_PAGE, chapters.length)}
                      <svg class="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1  0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {#if showChapterDropdown}
                    <div
                      role="chapter-menu"
                      aria-orientation="vertical"
                      aria-labelledby="chapter-menu-button"
                      tabindex="-1"
                      class="absolute right-0 mt-2 w-44 md:w-56 rounded-lg shadow-lg bg-[#1a0106] border border-[#ff003c]/20 ring-1 ring-black ring-opacity-5 focus:outline-none max-h-[60vh] overflow-y-auto z-50"
                    >
                      <div class="py-1" role="none">
                        {#each Array(totalChapterPages) as _, i}
                          <button
                            role="menuitem"
                            tabindex="-1"
                            on:click={() => { setChapterPage(i); showChapterDropdown = false; }}
                            class="text-[#ffb3c6] block px-4 py-2 text-sm w-full text-left hover:bg-[#2a0008] hover:text-white {chapterPage === i ? 'bg-[#2a0008] text-white' : ''}"
                          >
                            {i * CHAPTERS_PER_PAGE + 1}-{Math.min((i + 1) * CHAPTERS_PER_PAGE, chapters.length)}
                          </button>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>

            {#if chapters.length === 0}
              <div class="text-center py-12">
                <p class="text-[#ffb3c6] text-lg">No chapters available yet.</p>
              </div>
            {:else}
              <!-- Chapters List -->
              <ul class="divide-y divide-[#ff003c]/20 rounded-lg overflow-hidden bg-[#1a0106] border border-[#ff003c]/20 max-h-[36rem] overflow-y-auto thin-scrollbar-on-desktop">
                {#each pagedChapters as chapter}
                  <li class="flex items-center justify-between px-4 py-3 hover:bg-[#2a0008] transition">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-3">
                        <span class="bg-[#ff003c] text-white px-3 py-1 rounded-full text-xs font-bold flex-shrink-0">
                          Ch. {chapter.number}
                        </span>
                        <div class="flex-1 min-w-0">
                          <h3 class="font-semibold text-white truncate">{chapter.title}</h3>
                          <p class="text-xs text-[#ffb3c6]">{chapter.date}</p>
                        </div>
                      </div>
                    </div>
                    <a
                      href={`/hanime/manga/read/${chapter.slug}`}
                      class="bg-[#ff003c] hover:bg-[#c2002e] text-white font-bold px-4 py-1 rounded-lg shadow transition text-sm ml-4 flex-shrink-0"
                    >
                      Read
                    </a>
                  </li>
                {/each}
              </ul>
            {/if}
          </section>

          <!-- Related Series Section (new addition) -->
          {#if relatedSeries && relatedSeries.length > 0}
            <section class="mb-5">
              <h2 class="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <div class="w-1 h-8 bg-[#ff003c] rounded-full"></div>
                Related Series
              </h2>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 lg:gap-2">
                {#each relatedSeries as series}
                  <a
                    href={`/hanime/manga/info/${encodeURIComponent(series.slug)}`}
                    class="group relative bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-transform duration-200 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40 cursor-pointer block hover:scale-[1.05]"
                  >
                    <div class="relative aspect-[3/4]">
                      {#if !imageLoadedStates[`rel-manga-${series.slug}`]}
                        <div class="skeleton-loader absolute inset-0"></div>
                      {/if}
                      <img
                        src={series.featuredImageUrl}
                        alt={series.title}
                        class="w-full h-full object-cover {imageLoadedStates[`rel-manga-${series.slug}`] ? 'opacity-100' : 'opacity-0'}"
                        loading="lazy"
                        on:error={handleImageError}
                        on:load={() => handleImageLoad(`rel-manga-${series.slug}`)}
                      />
                      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    </div>
                    <div class="absolute bottom-0 left-0 right-0 p-3">
                      <h4 class="font-semibold text-white text-xs mb-2 line-clamp-2 group-hover:text-[#ff003c] transition-colors" title={series.title}>
                        {series.title}
                      </h4>
                      {#if series.latestChapter}
                        <div class="flex items-center gap-1">
                          <span class="bg-[#ff003c] text-white px-2 py-1 rounded text-[10px] font-bold">
                            Ch. {series.latestChapter}
                          </span>
                        </div>
                      {/if}
                    </div>
                  </a>
                {/each}
              </div>
            </section>
          {/if}

        </section>
      </div>
    </div>
  {/if}
  
  <Footer />
</div>

<style>
  @media (max-width: 768px) {
    .flex-shrink-0 {
      margin-left: auto;
      margin-right: auto;
    }
  }

  /* Skeleton Loader */
  .skeleton-loader {
    background-color: #3a0d16;
  }

  img {
    transition: opacity 0.3s ease-in-out;
  }

  /* Custom scrollbar styling for desktop */
  @media (min-width: 1024px) {
    .thin-scrollbar-on-desktop {
      -ms-overflow-style: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 0, 60, 0.3) transparent;
    }

    .thin-scrollbar-on-desktop::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }

    .thin-scrollbar-on-desktop::-webkit-scrollbar-track {
      background: transparent;
    }

    .thin-scrollbar-on-desktop::-webkit-scrollbar-thumb {
      background-color: rgba(255, 0, 60, 0.3);
      border-radius: 2px;
    }

    .thin-scrollbar-on-desktop::-webkit-scrollbar-thumb:hover,
    .thin-scrollbar-on-desktop::-webkit-scrollbar-thumb:active {
      background-color: rgba(255, 0, 60, 0.5);
    }
  }
</style>