<script lang="ts">
  import Footer from '$lib/components/Footer.svelte';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';

  export let data: {
    pages: { page: number, img: string, headerForImage?: Record<string, string> }[],
    chapterList: { id: string; shortId: string; title: string; chapterNumber?: string; releasedDate?: string }[],
    currentIndex: number,
    title: string,
    chapterNumber: string,
    mangaId: string,
    chapterId: string,
    anilistId: string
  };

  let pages = data.pages;
  let chapterList = data.chapterList;
  let currentIndex = data.currentIndex;
  let title = data.title;
  let chapterNumber = data.chapterNumber;
  let mangaId = data.mangaId;
  let chapterId = data.chapterId;
  let anilistId = data.anilistId;

  let error = '';
  let loading = false;
  let imageLoadingStates: boolean[] = [];
  let imageErrors: boolean[] = [];
  let showSidebar = false;
  let currentPage = 0;
  let zoomed = false;
  let isMobile = false;
  let observers: IntersectionObserver[] = [];

  $: {
    imageLoadingStates = new Array(pages.length).fill(true);
    imageErrors = new Array(pages.length).fill(false);
  }

  function getProxiedImageUrl(page: { img: string }) {
    if (page.img.startsWith('/api/manga?type=image&url=')) {
      return page.img;
    }
    return `/api/manga?type=image&url=${encodeURIComponent(page.img)}`;
  }

  function goToChapterByShortId(shortId: string) {
    goto(`/manga/read/${anilistId}/${mangaId}/${shortId}`);
  }

  function goToPrevChapter() {
    if (currentIndex > 0) {
      chapterId = chapterList[currentIndex - 1].shortId;
      goToChapterByShortId(chapterId);
    }
  }

  function goToNextChapter() {
    if (currentIndex < chapterList.length - 1) {
      chapterId = chapterList[currentIndex + 1].shortId;
      goToChapterByShortId(chapterId);
    }
  }

  function observePages() {
    // Clean up old observers
    observers.forEach((obs) => obs.disconnect());
    observers = [];

    if (!isMobile) return;

    pages.forEach((_, idx) => {
      const el = document.getElementById(`page-${idx}`);
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              currentPage = idx;
            }
          });
        },
        {
          root: null,
          threshold: 0.5, // 50% of the page is visible
        }
      );
      observer.observe(el);
      observers.push(observer);
    });
  }

  onMount(() => {
    // Check if mobile
    isMobile = window.innerWidth < 768;
    const handleResize = () => {
      isMobile = window.innerWidth < 768;
    };
    window.addEventListener('resize', handleResize);

    document.addEventListener('keydown', handleKeydown);
    observePages();
    window.addEventListener('resize', observePages);
    return () => {
      observers.forEach((obs) => obs.disconnect());
      window.removeEventListener('resize', observePages);
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', handleResize);
    };
  });

  function handleImageLoad(idx: number) {
    imageLoadingStates[idx] = false;
    imageErrors[idx] = false;
    imageLoadingStates = [...imageLoadingStates];
  }

  function handleImageError(idx: number) {
    imageLoadingStates[idx] = false;
    imageErrors[idx] = true;
    imageLoadingStates = [...imageLoadingStates];
    if (idx === 0) {
      error = 'Failed to load current page image.';
    }
  }

  $: if (data.chapterId !== chapterId) {
    pages = data.pages;
    chapterList = data.chapterList;
    currentIndex = data.currentIndex;
    title = data.title;
    chapterNumber = data.chapterNumber;
    mangaId = data.mangaId;
    chapterId = data.chapterId;
    anilistId = data.anilistId;
    error = '';
    loading = false;
    imageLoadingStates = new Array(pages.length).fill(true);
    imageErrors = new Array(pages.length).fill(false);
  }

  $: prevChapter = currentIndex > 0 ? chapterList[currentIndex - 1] : null;
  $: nextChapter = currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null;

  function handleKeydown(event: KeyboardEvent) {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }
    switch (event.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        event.preventDefault();
        if (currentPage > 0) currentPage--;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        event.preventDefault();
        if (currentPage < pages.length - 1) currentPage++;
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        event.preventDefault();
        goToPrevChapter();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        event.preventDefault();
        goToNextChapter();
        break;
      case 'Escape':
        event.preventDefault();
        if (zoomed) toggleZoom();
        else showSidebar = false;
        break;
      case ' ':
        event.preventDefault();
        if (currentPage < pages.length - 1) currentPage++;
        break;
    }
  }

  function toggleZoom() {
    zoomed = !zoomed;
    document.body.style.overflow = zoomed ? 'hidden' : '';
  }

  function scrollToCurrentPage() {
    const pageElement = document.getElementById(`page-${currentPage}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  let touchStartX = 0;
  let touchEndX = 0;

  function handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
      touchStartX = event.touches[0].clientX;
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    if (event.changedTouches.length === 1) {
      touchEndX = event.changedTouches[0].clientX;
      const deltaX = touchEndX - touchStartX;
      // Swipe threshold (in px)
      if (Math.abs(deltaX) > 60) {
        if (deltaX < 0) {
          // Swipe left: next page
          if (currentPage < pages.length - 1) currentPage++;
        } else {
          // Swipe right: previous page
          if (currentPage > 0) currentPage--;
        }
      }
    }
  }

  function handleZoomedImageClick(event: MouseEvent) {
    if (!isMobile) return;
    const img = event.currentTarget as HTMLElement;
    const rect = img.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x < rect.width / 2) {
      // Left side: previous page
      if (currentPage > 0) currentPage--;
    } else {
      // Right side: next page
      if (currentPage < pages.length - 1) currentPage++;
    }
  }
</script>

<svelte:head>
  <title>Read {title} - Chapter {chapterNumber} | ARMS Manga</title>
  <meta name="description" content={`Read ${title} Chapter ${chapterNumber} on ARMS Anime Streaming`} />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex flex-col relative">
  <!-- Mobile Header -->
  {#if isMobile}
    <header class="sticky top-0 z-50 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-gray-800 shadow-xl">
      <div class="flex items-center justify-between px-2 py-2">
        <!-- Left: Back Button -->
        <button
          class="flex items-center gap-1 bg-gray-800/80 hover:bg-gray-700/80 text-orange-400 px-2 py-1 rounded-lg transition-all duration-200 shadow"
          on:click={() => goto(`/manga/info/${anilistId}`)}
          aria-label="Back to Info"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <!-- Center: Title & Progress -->
        <div class="flex-1 flex flex-col items-center min-w-0 px-2">
          <div class="flex items-center gap-2 w-full">
            <span
              class="truncate font-bold text-orange-400 text-base max-w-[120px] sm:max-w-[180px] md:max-w-full"
              title={title}
            >
              {title}
            </span>
            <span class="text-xs text-gray-400 whitespace-nowrap">Ch. {chapterNumber}</span>
          </div>
          <div class="w-full flex items-center gap-2 mt-0.5">
            <span class="text-xs text-gray-500">{currentPage + 1}/{pages.length}</span>
            <div class="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
                style="width: {((currentPage + 1) / pages.length) * 100}%"
              ></div>
            </div>
          </div>
        </div>

        <!-- Right: Menu Button -->
        <button
          class="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white p-2 rounded-lg transition-all duration-200 shadow"
          on:click={() => showSidebar = !showSidebar}
          aria-label="Show chapter list"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <!-- Navigation Bar -->
      <div class="flex items-center gap-2 px-2 pb-2 pt-1">
        <button
          class="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white px-3 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg text-sm flex-1 min-w-0 flex items-center justify-center gap-1"
          on:click={goToPrevChapter}
          disabled={!prevChapter}
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span class="hidden xs:inline">Prev</span>
        </button>
        <button
          class="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white px-3 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg text-sm flex-1 min-w-0 flex items-center justify-center gap-1"
          on:click={goToNextChapter}
          disabled={!nextChapter}
        >
          <span class="hidden xs:inline">Next</span>
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </header>
  {:else}
    <!-- Desktop Header (old look) -->
    <header class="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800 shadow-2xl">
      <div class="flex items-center px-6 py-2">
        <button
          class="mr-4 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-orange-400 px-3 py-2 rounded-xl flex items-center gap-3 transition-all duration-200 shadow-lg"
          on:click={() => goto(`/manga/info/${anilistId}`)}
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          <span class="font-medium text-sm">Back to Info</span>
        </button>

        <div class="flex-1 flex items-center gap-4">
          <!-- Prev Button Left -->
          <button
            class="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white px-6 py-2 h-10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg text-base flex items-center gap-2 justify-center min-w-[160px]"
            on:click={goToPrevChapter}
            disabled={!prevChapter}
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <!-- Title and Progress Center -->
          <div class="flex-1 text-center">
            <h1 class="text-lg font-bold text-orange-400 mb-1">{title}</h1>
            <p class="text-xs text-gray-400">Chapter {chapterNumber} • Page {currentPage + 1} of {pages.length}</p>
          </div>

          <!-- Next Button Right -->
          <button
            class="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white px-6 py-2 h-10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg text-base flex items-center gap-2 justify-center min-w-[160px]"
            on:click={goToNextChapter}
            disabled={!nextChapter}
          >
            Next
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            class="ml-4 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-orange-400 px-3 py-2 rounded-xl transition-all duration-200 shadow-lg"
            on:click={() => showSidebar = !showSidebar}
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  {/if}

  <!-- Sidebar -->
  {#if showSidebar}
    <div
      class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-all duration-300"
      on:click={() => showSidebar = false}
    ></div>
    <aside
      class={`fixed top-0 h-full bg-gradient-to-b from-gray-900 to-gray-800 border-gray-700 z-50 overflow-visible shadow-2xl ${
        isMobile
          ? 'left-0 w-[70vw] max-w-xs border-r sidebar-slide-right'
          : 'right-0 w-72 border-l sidebar-slide-left'
      }`}
    >
      <div class="flex flex-col h-full">
        <div class="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-800/50">
          <h2 class="text-base font-bold text-orange-400">Chapters</h2>
          <button
            class="text-gray-400 hover:text-orange-400 p-2 rounded-lg hover:bg-gray-700/50 transition-all duration-200"
            on:click={() => showSidebar = false}
            tabindex="0"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 p-1 space-y-1 overflow-y-auto no-scrollbar">
          {#each chapterList as chapter}
            <button
              class="w-full text-left p-2 rounded-lg transition-all duration-200 group text-[0.92rem]
                {chapterId === chapter.shortId
                  ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg scale-[1.02]'
                  : 'hover:bg-gray-700/50 text-gray-300 hover:text-white'}"
              on:click={() => {
                chapterId = chapter.shortId;
                goToChapterByShortId(chapter.shortId);
                showSidebar = false;
              }}
            >
              <div
                class="font-medium truncate {chapterId === chapter.shortId ? 'text-white' : 'group-hover:text-orange-400'} text-[0.97rem]"
                title={chapter.title}
              >
                {chapter.title.length > 38 ? `${chapter.title.slice(0, 38)}…` : chapter.title}
              </div>
              {#if chapter.releasedDate}
                <div
                  class="text-xs {chapterId === chapter.shortId ? 'text-orange-100' : 'text-gray-400'} mt-1 text-[0.80rem] truncate"
                  title={chapter.releasedDate}
                >
                  {chapter.releasedDate}
                </div>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </aside>
  {/if}

  <!-- Reader Area -->
  <main
    class="flex-1 px-2 py-3 md:px-6 md:py-8"
    on:touchstart={handleTouchStart}
    on:touchend={handleTouchEnd}
  >
    {#if loading}
      <div class="flex items-center justify-center flex-1 py-20">
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-orange-400"></div>
          <p class="text-gray-400">Loading chapter...</p>
        </div>
      </div>
    {:else if error}
      <div class="flex items-center justify-center flex-1 py-20">
        <div class="bg-gradient-to-r from-red-900/80 to-red-800/80 border border-red-600/50 text-red-100 p-6 rounded-2xl text-center backdrop-blur-sm shadow-2xl">
          <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p class="font-bold text-lg mb-2">Error Loading Chapter</p>
          <p class="mb-4 text-red-200">{error}</p>
          <button 
            class="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg"
            on:click={() => error = ''}
          >
            Dismiss
          </button>
        </div>
      </div>
    {:else if pages.length === 0}
      <div class="flex items-center justify-center flex-1 py-20">
        <div class="text-center">
          <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-orange-400 text-xl font-medium">No pages found for this chapter</p>
          <p class="text-gray-400 mt-2">Try selecting a different chapter</p>
        </div>
      </div>
    {:else}
      <div class="max-w-4xl mx-auto">
        <div class="space-y-4 md:space-y-6">
          {#each pages as page, idx}
            <div id="page-{idx}" class="flex flex-col items-center">
              {#if imageLoadingStates[idx]}
                <div class="w-full h-80 md:h-[600px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl">
                  <div class="flex flex-col items-center gap-3">
                    <div class="animate-spin rounded-full h-8 w-8 border-4 border-gray-700 border-t-orange-400"></div>
                    <p class="text-gray-400 text-sm">Loading page {idx + 1}...</p>
                  </div>
                </div>
              {/if}
              
              {#if imageErrors[idx]}
                <div class="w-full h-80 md:h-[600px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl md:rounded-2xl flex flex-col items-center justify-center border-2 border-red-500/50 shadow-xl">
                  <svg class="w-12 h-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div class="text-red-100 text-center mb-4">
                    <p class="font-bold text-lg">Failed to load page {idx + 1}</p>
                    <p class="text-sm text-red-200">Check your connection or try refreshing</p>
                  </div>
                  <button 
                    class="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg"
                    on:click={() => {
                      imageErrors[idx] = false;
                      imageLoadingStates[idx] = true;
                      imageLoadingStates = [...imageLoadingStates];
                    }}
                  >
                    Retry
                  </button>
                </div>
              {:else}
                <div class="relative group">
                  <img
                    src={getProxiedImageUrl(page)}
                    alt={`Page ${page.page ?? (idx + 1)}`}
                    class="w-full h-auto max-h-[70vh] md:max-h-[600px] rounded-xl md:rounded-2xl shadow-2xl bg-gray-900 cursor-zoom-in transition-all duration-300 {imageLoadingStates[idx] ? 'opacity-0' : 'opacity-100'} hover:shadow-orange-400/20"
                    loading="lazy"
                    on:click={() => { currentPage = idx; toggleZoom(); }}
                    on:load={() => handleImageLoad(idx)}
                    on:error={() => handleImageError(idx)}
                    style="object-fit: contain;"
                  />
                  <div class="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-black/70 backdrop-blur-sm text-white px-2 py-1 md:px-3 md:py-1 rounded-lg text-xs md:text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Tap to zoom
                  </div>
                </div>
              {/if}
              
              <div class="mt-2 md:mt-3 text-center">
                <span class="text-xs text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">Page {idx + 1}</span>
              </div>
            </div>
          {/each}
        </div>

        <!-- End of Chapter Navigation -->
        <div class="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 mt-8 md:mt-12 text-center shadow-2xl border border-gray-700">
          <div class="mb-6">
            <svg class="w-12 h-12 text-orange-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-{isMobile ? 'xl' : '2xl'} font-bold text-orange-400 mb-2">Chapter Complete!</h3>
            <p class="text-gray-400">Ready for the next chapter?</p>
          </div>
          
          <div class="flex flex-col md:flex-row justify-center gap-4">
            {#if prevChapter}
              <button
                class="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white px-6 py-2 h-10 rounded-xl transition-all duration-200 shadow-lg flex items-center gap-2 justify-center"
                on:click={() => goToChapterByShortId(prevChapter.shortId)}
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Previous Chapter
              </button>
            {/if}
            
            {#if nextChapter}
              <button
                class="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white px-6 py-2 h-10 rounded-xl transition-all duration-200 shadow-lg flex items-center gap-2 justify-center"
                on:click={() => goToChapterByShortId(nextChapter.shortId)}
              >
                Next Chapter
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </main>

  <Footer />

  <!-- Zoom Overlay -->
  {#if zoomed}
    <div 
      class="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      on:click={toggleZoom}
      on:keydown={(e) => e.key === 'Escape' && toggleZoom()}
      tabindex="0"
      role="dialog"
      aria-modal="true"
    >
      <img
        src={getProxiedImageUrl(pages[currentPage])}
        alt={`Page ${pages[currentPage].page ?? (currentPage + 1)}`}
        class="max-w-full max-h-full object-contain cursor-zoom-out shadow-2xl rounded-lg"
        on:click|stopPropagation={zoomed && isMobile ? handleZoomedImageClick : undefined}
      />
      <div class="absolute top-6 right-6 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-xl shadow-lg">
        <span class="text-sm font-medium">Page {currentPage + 1} of {pages.length}</span>
      </div>
      <button
        class="absolute top-6 left-6 bg-black/70 backdrop-blur-sm text-white p-2 rounded-xl hover:bg-black/80 transition-all duration-200"
        on:click|stopPropagation={toggleZoom}
        tabindex="0"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/if}

  <!-- Mobile Reading Progress Bar -->
  {#if isMobile}
    <div class="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-gray-800 p-3 z-30">
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-400 min-w-0">Progress</span>
        <div class="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
          <div 
            class="bg-gradient-to-r from-orange-500 to-orange-400 h-full transition-all duration-300 ease-out"
            style="width: {((currentPage + 1) / pages.length) * 100}%"
          ></div>
        </div>
        <span class="text-xs text-orange-400 font-medium">{Math.round(((currentPage + 1) / pages.length) * 100)}%</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .sidebar-slide-right {
    animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .sidebar-slide-left {
    animation: slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @keyframes slideInRight {
    from { transform: translateX(-100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideInLeft {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  /* Hide scrollbars for dropdown and chapters list */
  .no-scrollbar {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
  select.touch-manipulation {
    /* Makes dropdown easier to use on touch devices */
    font-size: 1.05rem;
    min-height: 2.5rem;
    /* Optional: increase tap target */
  }
</style>
