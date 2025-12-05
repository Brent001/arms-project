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

  // Filter recommendations and relations to only show manga-related content
  const allowedMangaTypes = ['MANGA', 'NOVEL', 'LIGHT_NOVEL', 'ONE_SHOT', 'DOUJINSHI', 'MANHWA', 'MANHUA'];
  $: filteredRecommendations = recommendations.filter((item: { type?: string }) => allowedMangaTypes.includes(item.type ?? ''));
  $: filteredRelations = relations.filter((item: { type?: string }) => allowedMangaTypes.includes(item.type ?? ''));

  // Chapter management
  // `chapters` array is only updated explicitly by `fetchChaptersData`.
  let chapters: any[] = []; // Start empty, will be filled by onMount or fetches

  // `selectedProviderUi` holds the provider currently selected in the UI dropdown.
  // It's initially set from `data.selectedProvider` (from load function) and can be
  // overridden by localStorage or user interaction.
  let selectedProviderUi: string = data.selectedProvider || 'mangahere';
  let chapterLoading: boolean = false;
  let chapterError: string | null = null;
  
  // Track which manga's and provider's chapters are currently loaded into the `chapters` array.
  let currentMangaIdForChapters: string | null = null; 
  let currentProviderForChapters: string | null = null; 
  
  let isMounted = false; // Flag to indicate if onMount has run

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
      // When navigating to a new manga info page, always include the current selected provider.
      await goto(`/manga/info/${id}?provider=${encodeURIComponent(selectedProviderUi)}`);
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
  let imageLoadedStates: { [key: string]: boolean } = {};

  // Reset image loaded states when the manga data changes
  $: if (manga) {
    imageLoadedStates = {};
  }

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
      img.onerror = null; // Prevent infinite loop
    }
  }

  function handleImageLoad(id: string) {
    imageLoadedStates[id] = true;
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
  async function fetchChaptersData(provider: string, mangaId: string, forceFetch: boolean = false) {
    if (!mangaId) return;

    // Prevent re-fetching if chapters for this manga and provider are already loaded and not forced
    // This check is important for client-side navigation.
    if (!forceFetch && !chapterLoading && currentMangaIdForChapters === mangaId && currentProviderForChapters === provider) {
      // If we have chapters and they match what's requested, no need to fetch again
      if (chapters.length > 0) return;
    }

    chapterLoading = true;
    chapterError = null;
    chapterPage = 0; // Reset pagination when provider changes
    currentMangaIdForChapters = mangaId; // Set the mangaId we're fetching chapters for
    currentProviderForChapters = provider; // Set the provider we're fetching chapters for

    // Save the selected provider to localStorage
    if (browser && provider) {
      localStorage.setItem('selectedMangaProvider', provider);
    }
    
    // Update the URL to reflect the selected provider using replaceState
    // Only update if it's actually different to avoid unnecessary history entries
    if (browser && provider && manga && manga.id) {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get('provider') !== provider) {
            currentUrl.searchParams.set('provider', provider);
            window.history.replaceState({}, '', currentUrl.toString());
        }
    }

    try {
      // Pass the selected provider to the API call
      const resp = await fetch(`/api/manga?type=info&id=${encodeURIComponent(mangaId)}&provider=${encodeURIComponent(provider)}`);
      if (!resp.ok) {
        throw new Error(`Failed to load chapters from ${provider}.`);
      }
      const json = await resp.json();
      if (json.success && json.data?.chapters) {
        chapters = json.data.chapters; // Explicitly update `chapters` when fetching
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

  // Reactive statement to trigger chapter fetch when `manga.id` changes (client-side navigation)
  // or when `selectedProviderUi` changes (from localStorage or user dropdown).
  // This will only run after `onMount` has completed (`isMounted` is true).
  $: if (browser && isMounted && manga?.id) {
    // Only trigger fetch if the current chapters loaded don't match the active manga/provider in UI
    if (currentMangaIdForChapters !== manga.id || currentProviderForChapters !== selectedProviderUi) {
        fetchChaptersData(selectedProviderUi, manga.id, true); // Force fetch new chapters
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

      const storedProvider = localStorage.getItem('selectedMangaProvider');
      let initialProviderToFetch = data.selectedProvider || 'mangahere';

      // If a stored provider exists and differs from the one initially loaded (data.selectedProvider),
      // update `selectedProviderUi` to reflect this preference.
      if (storedProvider && (storedProvider === 'mangahere' || storedProvider === 'mangapill')) {
        if (storedProvider !== initialProviderToFetch) {
          selectedProviderUi = storedProvider; // Update UI dropdown to show stored provider
          initialProviderToFetch = storedProvider; // Use stored provider for the very first fetch
        }
      }
      
      // Perform the initial fetch for chapters. This handles:
      // 1. Initial page load (SSR might not have chapters if API failed, or we're overriding with localStorage provider).
      // 2. Client-side navigation where `selectedProviderUi` might have been updated by localStorage
      //    (before the reactive block triggers due to `isMounted` being false).
      await fetchChaptersData(initialProviderToFetch, manga?.id, true); // Always force initial fetch

      isMounted = true; // Mark component as mounted, allowing reactive blocks to run for subsequent changes.
    }
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('resize', updateIsMobile);
      document.removeEventListener('click', handleClickOutside);
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
                    <div class="relative w-64 aspect-[3/4] rounded-lg border-4 border-gray-800 overflow-hidden bg-gray-800">
                      {#if !imageLoadedStates[`main-${manga.id}`]}
                        <div class="skeleton-loader absolute inset-0"></div>
                      {/if}
                      <img
                        src={manga.image}
                        alt={safeTruncate(manga.title?.english || manga.title?.romaji || manga.title?.native, 50)}
                        class="shadow-2xl w-full h-full object-cover {imageLoadedStates[`main-${manga.id}`] ? 'opacity-100' : 'opacity-0'}"
                        on:error={handleImageError}
                        on:load={() => handleImageLoad(`main-${manga.id}`)}
                      />
                    </div>
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
                      <span class="text-orange-300 font-semibold block mb-1 md:ml-0 ml-[-8px]">Overview:</span>
                      {#if isMobile}
                        <div
                          class="text-gray-200 text-sm leading-tight md:ml-0 ml-[-8px]"
                          style="max-height: 220px; overflow-y: auto; line-height: 1.4;"
                        >
                          {@html manga.description || 'No description available.'}
                        </div>
                      {:else if isLongDescription && !showFullDescription}
                        <div
                          class="text-gray-200 text-sm leading-tight md:ml-0 ml-[-8px]"
                          style="line-height: 1.4; position: relative;"
                        >
                          <span>
                            {@html safeTruncate(manga.description, DESCRIPTION_LIMIT)}
                          </span>
                          <button
                            class="text-orange-400 cursor-pointer text-sm font-semibold ml-1"
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
                          class="text-gray-200 text-sm leading-tight md:ml-0 ml-[-8px]"
                          style="line-height: 1.4;"
                        >
                          <span>
                            {@html manga.description}
                          </span>
                          <button
                            class="text-orange-400 cursor-pointer text-sm font-semibold ml-1"
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
                          class="text-gray-200 text-sm leading-tight md:ml-0 ml-[-8px]"
                          style="line-height: 1.4;"
                        >
                          {@html manga.description || 'No description available.'}
                        </div>
                      {/if}

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
                            {providerDisplayNames[selectedProviderUi] || selectedProviderUi.charAt(0).toUpperCase() + selectedProviderUi.slice(1)}
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
                                  class="text-gray-300 block px-4 py-2 text-sm w-full text-left hover:bg-gray-700 hover:text-white {selectedProviderUi === providerOption ? 'bg-gray-700 text-white' : ''}"
                                  role="menuitem"
                                  tabindex="-1"
                                  on:click={() => {
                                    selectedProviderUi = providerOption; // Update the UI state
                                    fetchChaptersData(selectedProviderUi, manga?.id, true); // Force fetch new chapters
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
                        on:click={() => fetchChaptersData(selectedProviderUi, manga?.id, true)}
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
                            href={`/manga/read/${manga.id}/${chapter.id}?provider=${encodeURIComponent(selectedProviderUi)}`}
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
                {#if filteredRecommendations.length}
                  <section class="mb-12">
                    <h2 class="text-2xl font-bold text-orange-400 mb-4">Recommended Manga</h2>
                    <div class="grid grid-cols-2 md:grid-cols-6 gap-2">
                      {#each filteredRecommendations as rec}
                        <a
                          href={`/manga/info/${rec.id}?provider=${encodeURIComponent(selectedProviderUi)}`}
                          on:click|preventDefault={() => handleMangaClick(rec.id)}
                          class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03]"
                          style="min-height: 120px;"
                        >
                          <span class="absolute top-2 left-2 z-10 bg-orange-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded shadow">
                            Manga
                          </span>
                          <div class="relative aspect-[3/4]">
                            {#if !imageLoadedStates[`rec-${rec.id}`]}
                              <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                            {/if}
                            <img 
                              src={rec.image} 
                              alt={rec.title?.english || rec.title?.romaji || rec.title?.native} 
                              class="w-full h-full object-cover {imageLoadedStates[`rec-${rec.id}`] ? 'opacity-100' : 'opacity-0'}" 
                              loading="lazy" 
                              on:load={() => handleImageLoad(`rec-${rec.id}`)}
                              on:error={handleImageError}
                            />
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
                {#if filteredRelations.length}
                  <section class="mb-12">
                    <h2 class="text-2xl font-bold text-orange-400 mb-4">Related Works</h2>
                    <div class="grid grid-cols-2 md:grid-cols-6 gap-2">
                      {#each filteredRelations as rel}
                        <a
                          href={`/manga/info/${rel.id}?provider=${encodeURIComponent(selectedProviderUi)}`}
                          class="group relative bg-gray-800 rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-orange-400 hover:shadow-orange-400/40 cursor-pointer block hover:scale-[1.03]"
                          style="min-height: 120px;"
                        >
                          <span class="absolute top-2 left-2 z-10 bg-orange-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded shadow">
                            Manga
                          </span>
                          <div class="relative aspect-[3/4]">
                            {#if !imageLoadedStates[`rel-${rel.id}`]}
                              <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                            {/if}
                            <img 
                              src={rel.image} 
                              alt={rel.title?.english || rel.title?.romaji || rel.title?.native} 
                              class="w-full h-full object-cover {imageLoadedStates[`rel-${rel.id}`] ? 'opacity-100' : 'opacity-0'}" 
                              loading="lazy" 
                              on:load={() => handleImageLoad(`rel-${rel.id}`)}
                              on:error={handleImageError}
                            />
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
                      {#each characters as char, i}
                        <div class="flex gap-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl shadow-lg p-4 border border-gray-800 hover:border-orange-400 transition">
                          <div class="relative w-20 h-28 rounded-lg border-2 border-gray-700 shadow overflow-hidden bg-gray-800">
                            {#if !imageLoadedStates[`char-${i}`]}
                              <div class="skeleton-loader absolute inset-0"></div>
                            {/if}
                            <img
                              src={char.image}
                              alt={char.name?.full || char.name?.native}
                              class="w-full h-full object-cover {imageLoadedStates[`char-${i}`] ? 'opacity-100' : 'opacity-0'}"
                              on:load={() => handleImageLoad(`char-${i}`)}
                              on:error={handleImageError}
                            />
                          </div>
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

  /* Skeleton Loader - plain background for performance */
  .skeleton-loader {
    background-color: #374151; /* gray-700 */
  }

  img {
    transition: opacity 0.3s ease-in-out;
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