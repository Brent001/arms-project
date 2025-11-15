<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types.js';
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  export let data: PageData;

  $: manga = data.manga;
  $: recommendations = data.recommendations ?? [];
  $: relations = data.relations ?? [];
  $: characters = data.characters ?? [];

  // Chapter management
  let chapters: any[] = [];
  let selectedProvider: string = 'mangahere'; // Default provider
  let chapterLoading: boolean = false;
  let chapterError: string | null = null;
  let initialChaptersLoaded = false; // To ensure initial data is processed before reacting to provider changes

  // Map internal provider names to display names
  const providerDisplayNames: { [key: string]: string } = {
    'mangahere': 'Server 1',
    'mangapill': 'Server 2'
  };

  // Pagination for chapters
  const CHAPTERS_PER_PAGE = 20;
  let chapterPage = 0;
  $: totalChapterPages = Math.ceil(chapters.length / CHAPTERS_PER_PAGE);
  $: pagedChapters = chapters.slice(
    chapterPage * CHAPTERS_PER_PAGE,
    (chapterPage + 1) * CHAPTERS_PER_PAGE
  );

  function setChapterPage(page: number) {
    chapterPage = page;
  }

  async function handleMangaClick(id: string) {
    try {
      await goto(`/manga/info/${id}`);
    } catch (e) {
      console.error('Navigation error:', e);
    }
  }

  // New variables for description expand/collapse and mobile view
  let showFullDescription = false;
  let isLongDescription = false;
  const DESCRIPTION_LIMIT = 450; // character limit for desktop
  let isMobile = false;

  // New variable for genre expand/collapse
  let showAllGenres = false;
  // New variable for custom chapter dropdown
  let showChapterDropdown = false;
  // New variable for custom provider dropdown
  let showProviderDropdown = false;


  function updateIsMobile() {
    if (browser) {
      isMobile = window.innerWidth <= 768;
    }
  }

  // Safe image error handling
  function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset.errorHandled) {
      img.dataset.errorHandled = 'true';
      img.src = '/assets/placeholder-manga-cover.jpg'; // Fallback image
      img.onerror = null; // Prevent infinite loop
    }
  }

  // Safe string truncation
  function safeTruncate(str: string | undefined | null, maxLength: number = 100): string {
    if (!str || typeof str !== 'string') return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }

  // Function to handle clicks outside the dropdowns to close them
  function handleClickOutside(event: MouseEvent) {
    if (showChapterDropdown && event.target && !document.getElementById('chapter-menu-button')?.contains(event.target as Node) && !(event.target as HTMLElement).closest('[role="chapter-menu"]')) {
      showChapterDropdown = false;
    }
    if (showProviderDropdown && event.target && !document.getElementById('provider-menu-button')?.contains(event.target as Node) && !(event.target as HTMLElement).closest('[role="provider-menu"]')) {
      showProviderDropdown = false;
    }
  }

  // Function to fetch chapters dynamically
  async function fetchChaptersData(provider: string, mangaId: string) {
    if (!mangaId) return; // Prevent fetching if manga ID is not available

    chapterLoading = true;
    chapterError = null;
    chapterPage = 0; // Reset pagination when provider changes

    // Save the selected provider to localStorage
    if (browser && provider) {
      localStorage.setItem('selectedMangaProvider', provider);
    }

    try {
      const resp = await fetch(`/api/manga?type=info&id=${encodeURIComponent(mangaId)}&provider=${provider}`);
      if (!resp.ok) {
        throw new Error(`Failed to load chapters from ${provider}.`);
      }
      const json = await resp.json();
      if (json.success && json.data?.chapters) {
        chapters = json.data.chapters;
      } else {
        chapterError = json.error || `No chapters found for ${providerDisplayNames[provider] || provider}.`;
        chapters = []; // Clear chapters on error
      }
    } catch (e: any) {
      console.error('Error fetching chapters:', e);
      chapterError = e.message || `Error fetching chapters for ${providerDisplayNames[provider] || provider}. Please try again.`;
      chapters = []; // Clear chapters on error
    } finally {
      chapterLoading = false;
    }
  }


  onMount(async () => {
    if (browser) {
      updateIsMobile();
      window.addEventListener('resize', updateIsMobile);
      if (manga?.description && manga.description.length > DESCRIPTION_LIMIT) {
        isLongDescription = true;
      }
      document.addEventListener('click', handleClickOutside);

      // Load selected provider from localStorage, or default if not found
      const storedProvider = localStorage.getItem('selectedMangaProvider');
      if (storedProvider && (storedProvider === 'mangahere' || storedProvider === 'mangapill')) {
        selectedProvider = storedProvider;
      } else {
        selectedProvider = 'mangahere'; // Fallback to default if nothing stored or invalid
      }

      // Initialize chapters using the (potentially) stored provider
      // If data.chapters is already populated from initial SSR/load function, use it.
      // Otherwise, fetch chapters.
      if (data.chapters && data.chapters.length > 0) {
        chapters = data.chapters;
        // Also ensure the selectedProvider matches the source of the initially loaded chapters, if available
        // This prioritizes the specific manga's default if it overrides the user's stored preference
        const initialSource = data.manga?.source?.toLowerCase();
        if (initialSource === 'mangahere' || initialSource === 'mangapill') {
          selectedProvider = initialSource;
          // IMPORTANT: If we're using the initialSource, we should also save it
          // to localStorage to reflect the "intended" provider for this specific manga.
          localStorage.setItem('selectedMangaProvider', selectedProvider);
        }
        // If the initial chapters came from `data.chapters` but don't have a source
        // or the source is not one of our providers, still respect the stored preference,
        // so no change to `selectedProvider` here.
      } else {
        // If no chapters from initial load, fetch using the current `selectedProvider`
        await fetchChaptersData(selectedProvider, manga?.id);
      }
      initialChaptersLoaded = true;
    }
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('resize', updateIsMobile);
      document.removeEventListener('click', handleClickOutside); // Remove click listener
    }
  });
</script>

<svelte:head>
  <title>{manga?.title?.english || manga?.title?.romaji || manga?.title?.native} | ARMS Manga</title>
  <meta name="description" content={manga?.description || 'Discover this manga on ARMS Anime Streaming.'} />
  <meta property="og:title" content={manga?.title?.english || manga?.title?.romaji || manga?.title?.native} />
  <meta property="og:description" content={manga?.description || 'Discover this manga on ARMS.'} />
  <meta property="og:image" content={manga?.image || '/assets/default-manga-cover.jpg'} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={`https://arms-anime.com/manga/info/${manga?.id}`} />
</svelte:head>

<Navbar />

<div class="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pt-16">
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
      <div class="max-w-[125rem] mx-auto flex flex-col gap-6 sm:gap-10 px-2 sm:px-6">
        {#if manga}
          <div class="flex flex-col xl:flex-row gap-2 sm:gap-4 w-full">
            <!-- Main content -->
            <div class="flex-1 flex flex-col gap-6 sm:gap-10">
              <!-- Main Info Card -->
              <section class="flex-1 flex flex-col gap-8 mb-5">
                <div class="flex flex-col md:flex-row gap-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg shadow-2xl p-6 md:p-10">
                  <!-- Poster -->
                  <div class="flex flex-col items-center md:items-start flex-shrink-0 mx-auto md:mx-0">
                    <img
                      src={manga.image || '/assets/placeholder-manga-cover.jpg'}
                      alt={safeTruncate(manga.title?.english || manga.title?.romaji || manga.title?.native, 50)}
                      class="rounded-lg shadow-2xl w-64 h-auto object-cover border-4 border-gray-800"
                      on:error={handleImageError}
                    />
                  </div>
                  <!-- Details -->
                  <div class="flex-1 space-y-3">
                    <div class="flex items-center gap-2 sm:gap-3 md:ml-0 ml-[-8px]">
                      <h1 class="text-xl sm:text-3xl font-bold text-orange-400 {isMobile ? 'w-full text-center' : ''}">
                        {manga.title?.english || manga.title?.romaji || manga.title?.native || 'Unknown Manga'}
                      </h1>
                    </div>

                    <div class="space-y-3">
                      <!-- Genres at the top -->
                      {#if manga.genres && manga.genres.length > 0}
                        <div class="flex flex-wrap items-center gap-1.5 md:ml-0 ml-[-8px]">
                          {#each (isMobile && !showAllGenres ? manga.genres.slice(0, 3) : manga.genres) as genre}
                            <span class="bg-gray-800 text-orange-300 px-2 py-1 rounded text-xs font-medium">
                              {genre}
                            </span>
                          {/each}
                          {#if isMobile && manga.genres.length > 3}
                            <button
                              class="text-orange-300 hover:text-orange-400 text-xs font-semibold"
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
                      <div class="text-gray-200 text-base mb-2">
                        {#if isLongDescription && !showFullDescription}
                          {@html safeTruncate(manga.description, DESCRIPTION_LIMIT)}
                          <button
                            class="text-orange-400 cursor-pointer text-sm font-semibold ml-1"
                            on:click={() => (showFullDescription = true)}
                            aria-expanded={showFullDescription}
                            aria-controls="manga-description"
                          >
                            ...more
                          </button>
                        {:else}
                          {@html manga.description}
                          {#if isLongDescription}
                            <button
                              class="text-orange-400 cursor-pointer text-sm font-semibold ml-1"
                              on:click={() => (showFullDescription = false)}
                              aria-expanded={showFullDescription}
                              aria-controls="manga-description"
                            >
                              ...less
                            </button>
                          {/if}
                        {/if}
                      </div>

                      <div class="flex flex-wrap gap-2 mb-2">
                        <span class="bg-orange-400 text-gray-900 px-2 py-0.5 rounded-full text-xs font-bold">{manga.status}</span>
                        {#if manga.releaseDate}
                          <!-- Apply a smaller font size for mobile, and text-xs for larger screens -->
                          <span class="bg-gray-900 text-orange-300 px-2 py-0.5 rounded-full text-[10px] sm:text-xs">Year: {manga.releaseDate}</span>
                        {/if}
                        {#if manga.rating}
                          <span class="bg-gray-900 text-orange-300 px-2 py-0.5 rounded-full text-xs">Rating: {manga.rating}</span>
                        {/if}
                        {#if manga.popularity}
                          <span class="bg-gray-900 text-orange-300 px-2 py-0.5 rounded-full text-xs">Popularity: {manga.popularity}</span>
                        {/if}
                        {#if manga.type}
                          <span class="bg-gray-900 text-orange-300 px-2 py-0.5 rounded-full text-xs">{manga.type}</span>
                        {/if}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Chapters Section -->
                <section class="mb-1">
                  <!-- Reduce the gap between items here -->
                  <div class="flex items-center gap-2 mb-4 flex-wrap">
                    <h2 class="text-2xl font-bold text-orange-400">Chapters</h2>
                    
                    {#if totalChapterPages > 1}
                        <!-- Chapter Pagination Dropdown -->
                        <div class="relative inline-block text-left z-10">
                          <div>
                            <button
                              type="button"
                              class="inline-flex justify-center w-full rounded-lg border border-gray-700 shadow-sm px-3 py-2 bg-gray-800 text-sm font-medium text-orange-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-orange-500 transition whitespace-nowrap"
                              id="chapter-menu-button"
                              aria-expanded={showChapterDropdown}
                              aria-haspopup="true"
                              on:click={() => (showChapterDropdown = !showChapterDropdown)}
                            >
                              Page {chapterPage * CHAPTERS_PER_PAGE + 1}-{Math.min((chapterPage + 1) * CHAPTERS_PER_PAGE, chapters.length)}
                              <svg class="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                              </svg>
                            </button>
                          </div>

                          {#if showChapterDropdown}
                            <div
                              class="origin-top-left absolute left-0 mt-2 w-48 md:w-56 rounded-lg shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none max-h-60 overflow-y-auto"
                              role="chapter-menu"
                              aria-orientation="vertical"
                              aria-labelledby="chapter-menu-button"
                              tabindex="-1"
                            >
                              <div class="py-1" role="none">
                                {#each Array(totalChapterPages) as _, i}
                                  <button
                                    class="text-gray-300 block px-4 py-2 text-sm w-full text-left hover:bg-gray-700 hover:text-white {chapterPage === i ? 'bg-gray-700 text-white' : ''}"
                                    role="menuitem"
                                    tabindex="-1"
                                    on:click={() => {
                                      setChapterPage(i);
                                      showChapterDropdown = false;
                                    }}
                                  >
                                    {i * CHAPTERS_PER_PAGE + 1}-{Math.min((i + 1) * CHAPTERS_PER_PAGE, chapters.length)}
                                  </button>
                                {/each}
                              </div>
                            </div>
                          {/if}
                        </div>
                      {/if}

                      <!-- Provider Dropdown -->
                      <div class="relative inline-block text-left z-10">
                        <div>
                          <button
                            type="button"
                            class="inline-flex justify-center w-full rounded-lg border border-gray-700 shadow-sm px-3 py-2 bg-gray-800 text-sm font-medium text-orange-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-orange-500 transition whitespace-nowrap"
                            id="provider-menu-button"
                            aria-expanded={showProviderDropdown}
                            aria-haspopup="true"
                            on:click={() => (showProviderDropdown = !showProviderDropdown)}
                          >
                            {providerDisplayNames[selectedProvider] || selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}
                            <svg class="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                          </button>
                        </div>

                        {#if showProviderDropdown}
                          <div
                            class="origin-top-right absolute right-0 mt-2 w-40 rounded-lg shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none max-h-60 overflow-y-auto"
                            role="provider-menu"
                            aria-orientation="vertical"
                            aria-labelledby="provider-menu-button"
                            tabindex="-1"
                          >
                            <div class="py-1" role="none">
                              {#each ['mangahere', 'mangapill'] as providerOption}
                                <button
                                  class="text-gray-300 block px-4 py-2 text-sm w-full text-left hover:bg-gray-700 hover:text-white {selectedProvider === providerOption ? 'bg-gray-700 text-white' : ''}"
                                  role="menuitem"
                                  tabindex="-1"
                                  on:click={() => {
                                    selectedProvider = providerOption;
                                    fetchChaptersData(selectedProvider, manga?.id); // This already saves to localStorage
                                    showProviderDropdown = false;
                                  }}
                                >
                                  {providerDisplayNames[providerOption] || providerOption.charAt(0).toUpperCase() + providerOption.slice(1)}
                                </button>
                              {/each}
                            </div>
                          </div>
                        {/if}
                      </div>
                    </div>

                  {#if chapterLoading}
                    <ul class="divide-y divide-gray-800 rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 max-h-[36rem] overflow-y-auto thin-scrollbar-on-desktop">
                      {#each Array(7) as _, i} <!-- Display 7 skeleton items -->
                        <li class="flex items-center justify-between px-4 py-3 animate-pulse">
                          <div class="flex-1 min-w-0 flex flex-col gap-2">
                            <div class="h-4 bg-gray-700 rounded w-3/4"></div> <!-- Skeleton for chapter title -->
                            <div class="h-3 bg-gray-700 rounded w-1/4"></div> <!-- Skeleton for released date -->
                          </div>
                          <div class="h-7 w-16 bg-gray-700 rounded-lg ml-4 flex-shrink-0"></div> <!-- Skeleton for 'Read' button -->
                        </li>
                      {/each}
                    </ul>
                  {:else if chapterError}
                    <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-xl my-4">
                      <p class="font-bold">ERROR: {chapterError}</p>
                      <button
                        class="mt-2 px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                        on:click={() => fetchChaptersData(selectedProvider, manga?.id)}
                      >
                        Try Again
                      </button>
                    </div>
                  {:else if chapters.length === 0}
                    <div class="text-gray-400 p-4">No chapters found for the selected provider.</div>
                  {:else}
                    <ul class="divide-y divide-gray-800 rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 max-h-[36rem] overflow-y-auto thin-scrollbar-on-desktop">
                      {#each pagedChapters as chapter}
                        <li class="flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition">
                          <div class="flex-1 min-w-0">
                            <span class="font-semibold text-orange-300 line-clamp-2">{chapter.title}</span>
                            {#if chapter.releasedDate}
                              <span class="ml-2 text-xs text-gray-400">({chapter.releasedDate})</span>
                            {/if}
                          </div>
                          <a
                            href={`/manga/read/${manga.id}/${chapter.id}`}
                            class="bg-orange-400 hover:bg-orange-500 text-gray-900 font-bold px-4 py-1 rounded-lg shadow transition text-sm ml-4 flex-shrink-0"
                          >
                            Read
                          </a>
                        </li>
                      {/each}
                    </ul>
                  {/if}
                </section>

                <!-- Recommendations -->
                {#if recommendations.length}
                  <section class="mb-12">
                    <h2 class="text-2xl font-bold text-orange-400 mb-4">Recommended Manga</h2>
                    <div class="grid grid-cols-2 md:grid-cols-6 gap-2">
                      {#each recommendations as rec}
                        <a
                          href={`/manga/info/${rec.id}`}
                          on:click|preventDefault={() => handleMangaClick(rec.id)}
                          class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03]"
                          style="min-height: 120px;"
                        >
                          <span class="absolute top-2 left-2 z-10 bg-orange-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded shadow">
                            Manga
                          </span>
                          <div class="relative aspect-[3/4]">
                            <img src={rec.image} alt={rec.title?.english || rec.title?.romaji || rec.title?.native} class="w-full h-full object-cover" loading="lazy" />
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                          </div>
                          <div class="absolute bottom-0 left-0 right-0 p-1">
                            <h3 class="font-semibold text-white text-xs mb-0.5 line-clamp-2 group-hover:text-orange-200 transition-colors" title={rec.title?.english || rec.title?.romaji || rec.title?.native}>
                              {rec.title?.english || rec.title?.romaji || rec.title?.native}
                            </h3>
                            <div class="flex flex-wrap gap-0.5">
                              <span class="bg-orange-400 text-gray-900 px-1 py-0.5 rounded text-[9px] font-bold">{rec.type}</span>
                              {#if rec.rating}
                                <span class="bg-gray-900 text-orange-300 px-1 py-0.5 rounded text-[9px]">Rating: {rec.rating}</span>
                              {/if}
                            </div>
                          </div>
                        </a>
                      {/each}
                    </div>
                  </section>
                {/if}

                <!-- Relations -->
                {#if relations.length}
                  <section class="mb-12">
                    <h2 class="text-2xl font-bold text-orange-400 mb-4">Related Works</h2>
                    <div class="grid grid-cols-2 md:grid-cols-6 gap-2">
                      {#each relations as rel}
                        <a
                          href={`/manga/info/${rel.id}`}
                          class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03]"
                          style="min-height: 120px;"
                        >
                          <span class="absolute top-2 left-2 z-10 bg-orange-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded shadow">
                            Manga
                          </span>
                          <div class="relative aspect-[3/4]">
                            <img src={rel.image} alt={rel.title?.english || rel.title?.romaji || rel.title?.native} class="w-full h-full object-cover" loading="lazy" />
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                          </div>
                          <div class="absolute bottom-0 left-0 right-0 p-1">
                            <h3 class="font-semibold text-white text-xs mb-0.5 line-clamp-2 group-hover:text-orange-200 transition-colors" title={rel.title?.english || rel.title?.romaji || rel.title?.native}>
                              {rel.title?.english || rel.title?.romaji || rel.title?.native}
                            </h3>
                            <div class="flex flex-wrap gap-0.5">
                              <span class="bg-orange-400 text-gray-900 px-1 py-0.5 rounded text-[9px] font-bold">{rel.type}</span>
                              {#if rel.rating}
                                <span class="bg-gray-900 text-orange-300 px-1 py-0.5 rounded text-[9px]">Rating: {rel.rating}</span>
                              {/if}
                            </div>
                          </div>
                        </a>
                      {/each}
                    </div>
                  </section>
                {/if}

                <!-- Characters -->
                {#if characters.length}
                  <section>
                    <h2 class="text-2xl font-bold text-orange-400 mb-4">Characters</h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {#each characters as char}
                        <div class="flex gap-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl shadow-lg p-4 border border-gray-800 hover:border-orange-400 transition">
                          <img
                            src={char.image}
                            alt={char.name?.full || char.name?.native}
                            class="w-20 h-28 rounded-lg object-cover border-2 border-gray-700 shadow"
                          />
                          <div class="flex-1 min-w-0 flex flex-col justify-center">
                            <div class="flex items-center gap-2 mb-1">
                              <span class="font-bold text-base text-orange-300 truncate">{char.name?.full || char.name?.native}</span>
                              {#if char.role}
                                <span class="ml-2 bg-orange-400 text-gray-900 px-2 py-0.5 rounded-full text-xs font-bold">{char.role}</span>
                              {/if}
                            </div>
                            {#if char.name?.native && char.name?.native !== char.name?.full}
                              <div class="text-xs text-gray-400 truncate">{char.name.native}</div>
                            {/if}
                            {#if char.description}
                              <div class="text-xs text-gray-300 mt-1 line-clamp-2">{char.description}</div>
                            {/if}
                          </div>
                        </div>
                      {/each}
                    </div>
                  </section>
                {/if}
              </section>
            </div>
          </div>
        {:else}
          <div class="text-center text-red-400">Manga not found or failed to load.</div>
        {/if}
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

  /* Custom scrollbar styling for desktop */
  @media (min-width: 1024px) { /* Adjust breakpoint as needed for "desktop" */
    .thin-scrollbar-on-desktop {
      /* Keep standard scrollbar behavior */
      -ms-overflow-style: auto;  /* IE and Edge */
      scrollbar-width: thin;     /* Firefox */
      /* For Firefox, a dark grey thumb that blends with the background */
      scrollbar-color: rgba(120, 120, 120, 0.3) transparent;
    }

    /* Webkit-specific scrollbar styling (Chrome, Safari, Opera, Edge) */
    .thin-scrollbar-on-desktop::-webkit-scrollbar {
      width: 4px; /* Make the scrollbar even thinner */
      height: 4px; /* Height for horizontal scrollbar if any */
    }

    .thin-scrollbar-on-desktop::-webkit-scrollbar-track {
      background: transparent; /* Make track transparent */
    }

    .thin-scrollbar-on-desktop::-webkit-scrollbar-thumb {
      /* A subtle dark grey thumb, blending with the dark theme */
      background-color: rgba(120, 120, 120, 0.3);
      border-radius: 2px; /* Rounded corners, scaled for thinner scrollbar */
    }

    /* Slightly more opaque when actively scrolling or hovered */
    .thin-scrollbar-on-desktop::-webkit-scrollbar-thumb:hover,
    .thin-scrollbar-on-desktop::-webkit-scrollbar-thumb:active {
      background-color: rgba(120, 120, 120, 0.5); /* More opaque on hover/active */
    }
  }
</style>
