<script lang="ts">
  import { onMount } from 'svelte';
  import Navbar from '$lib/components/hanime/Navbar.svelte';
  import Footer from '$lib/components/hanime/Footer.svelte';
  import AdultWarning from '$lib/components/hanime/AdultWarning.svelte';
  import Carousel from '$lib/components/hanime/Carousel.svelte';

  let featured: any[] = [];
  let monthlyReleases: any[] = [];
  let recentUncensored: any[] = [];
  let recentSeries: any[] = [];
  let recentEpisodes: any[] = [];
  let loading = true;
  let error: string | null = null;
  let showWarning = true;
  let isMobile = false;
  let imageLoadedStates: { [key: string]: boolean } = {};

  // Helper to get cookie value
  function getCookie(name: string) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  // Helper to set cookie
  function setCookie(name: string, value: string, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  }

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

  onMount(async () => {
    // Check cookie or localStorage for 18+ confirmation
    if (
      (typeof document !== 'undefined' && getCookie('arms18plus') === 'yes') ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('arms18plus') === 'yes')
    ) {
      showWarning = false;
    }
    try {
      const homeRes = await fetch('/api/hanime/home');
      const homeJson = await homeRes.json();

      if (homeJson.status === 'success' && homeJson.data?.data) {
        const homeData = homeJson.data.data;
        
        // Transform featured data for carousel
        featured = (homeData.featured || []).map((item: any) => ({
          id: item.slug,
          poster: item.imageUrl,
          name: item.title,
          rank: Math.round(parseFloat(item.rating) * 10) / 10 || 0,
          episodes: { sub: 0, dub: 0 },
          description: `${item.year} • Rating: ${item.rating}`,
          slug: item.slug
        }));
        
        // Get monthly releases items (limit on mobile)
        monthlyReleases = isMobile
          ? (homeData.monthlyReleases || []).slice(0, 12)
          : (homeData.monthlyReleases || []);
        
        // Get recent uncensored items (limit on mobile)
        recentUncensored = isMobile 
          ? (homeData.recentUncensored || []).slice(0, 12)
          : (homeData.recentUncensored || []);
        
        // Get recent series items (limit on mobile)
        recentSeries = isMobile
          ? (homeData.recentSeries || []).slice(0, 12)
          : (homeData.recentSeries || []);
        
        // Get recent episodes items (limit on mobile)
        recentEpisodes = isMobile 
          ? (homeData.recentEpisodes || []).slice(0, 12)
          : (homeData.recentEpisodes || []);
      }
    } catch (e) {
      error = 'Failed to load content. Please try again later.';
    } finally {
      loading = false;
    }
  });

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

  function handleWatch(id: string) {
    const item = featured.find(f => f.id === id);
    if (item?.slug) {
      window.location.href = `/hanime/info/${item.slug}`;
    }
  }
</script>

<svelte:head>
  <title>Home | ARMS Hentai</title>
  <meta name="description" content="Explore premium adult anime for mature audiences. Trending & new series, updated daily." />
  {#if isMobile}
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="preconnect" href="https://i.imgur.com">
  {/if}
</svelte:head>

<Navbar />

<div class="flex flex-col min-h-screen bg-gradient-to-br from-[#2a0008] via-[#3a0d16] to-[#1a0106] text-white">
  {#if loading}
    <div class="flex items-center justify-center flex-1">
      <img
        src="/assets/loader.gif"
        alt="Loading..."
        class="object-contain"
        style="max-width: 120px; max-height: 110px; aspect-ratio: 1 / 1;"
      />
    </div>
  {:else}
    <div class="flex-1 w-full pt-16">
      <div class="container-custom">
        <!-- Featured Carousel Section -->
        <section class="relative mb-6">
          {#if featured.length > 0}
            <Carousel animes={featured} intervalMs={10000} onWatch={handleWatch} />
          {:else}
            <div class="bg-[#2a0008] rounded-2xl overflow-hidden shadow-xl border border-[#ff003c]/20 px-4 py-8 sm:px-8 sm:py-10">
              <div class="flex items-center justify-center h-[220px] sm:h-[420px] text-[#ffb3c6]">
                Loading featured content...
              </div>
            </div>
          {/if}
        </section>

        <!-- Monthly Releases Section -->
        <section id="monthly" class="mb-8">
          <div class="flex items-center justify-between mb-6 gap-2">
            <div class="flex items-center gap-2 sm:gap-3">
              <div class="w-1 h-7 sm:h-8 bg-[#ff003c] rounded-full flex-shrink-0"></div>
              <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-white">Monthly Releases</h2>
            </div>
            <a href="/hanime/monthly-releases" class="see-more-btn flex-shrink-0">
              <span>See More</span>
              <svg class="see-more-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
          
          <div class="grid-monthly">
            {#each monthlyReleases as item, index}
              <a
                href={`/hanime/watch/${item.slug}`}
                class="group relative bg-[#1a0106] rounded-xl overflow-hidden shadow {isMobile ? 'border border-transparent' : 'transition-all duration-150 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40'} cursor-pointer block"
              >
                <div class="relative aspect-[3/4]">
                  {#if !imageLoadedStates[item.slug]}
                    <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                  {/if}
                  <img
                    src={item.imageUrl}
                    alt={item.seriesTitle}
                    class="w-full h-full object-cover {imageLoadedStates[item.slug] ? 'opacity-100' : 'opacity-0'}"
                    loading={index < (isMobile ? 6 : 12) ? 'eager' : 'lazy'}
                    decoding="async"
                    on:load={() => handleImageLoad(item.slug)}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent"></div>
                  <div class="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
                    <span class="bg-[#ff003c] text-white px-2 py-0.5 rounded text-[10px] font-semibold shadow">
                      Monthly
                    </span>
                    <span class="bg-black/70 {isMobile ? '' : 'backdrop-blur-sm'} text-[#ffb3c6] px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      {item.rating || '0'}
                    </span>
                  </div>
                  <div class="absolute bottom-0 left-0 right-0 p-2">
                    <h3 class="font-semibold text-white text-xs mb-1 line-clamp-2 drop-shadow-lg {isMobile ? '' : 'group-hover:text-[#ffb3c6] transition-colors'}" title={item.seriesTitle}>
                      {item.seriesTitle}
                    </h3>
                    <p class="text-[#ffb3c6] text-[10px] mb-1 drop-shadow">{item.episodeTitle}</p>
                    <div class="flex items-center justify-between">
                      <span class="bg-[#ff003c] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">18+</span>
                      <span class="text-[#ffb3c6] text-[10px]">{item.releaseDate || '--'}</span>
                    </div>
                  </div>
                </div>
              </a>
            {/each}
          </div>
        </section>

        <!-- Recent Uncensored Section -->
        <section id="uncensored" class="mb-8">
          <div class="flex items-center justify-between mb-6 gap-2">
            <div class="flex items-center gap-2 sm:gap-3">
              <div class="w-1 h-7 sm:h-8 bg-[#ff003c] rounded-full flex-shrink-0"></div>
              <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-white">Recent Uncensored</h2>
            </div>
            <a href="/hanime/genre/uncensored" class="see-more-btn flex-shrink-0">
              <span>See More</span>
              <svg class="see-more-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
          
          <div class="grid-responsive">
            {#each recentUncensored as item, index}
              <a
                href={`/hanime/watch/${item.slug}`}
                class="group relative bg-[#1a0106] rounded-xl overflow-hidden shadow {isMobile ? 'border border-transparent' : 'transition-transform duration-200 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40 hover:scale-[1.03]'} cursor-pointer block"
              >
                <div class="relative aspect-[3/4]">
                  {#if !imageLoadedStates[item.slug]}
                    <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                  {/if}
                  <img
                    src={item.imageUrl}
                    alt={item.seriesTitle}
                    class="w-full h-full object-cover {imageLoadedStates[item.slug] ? 'opacity-100' : 'opacity-0'}"
                    loading={index < (isMobile ? 6 : 12) ? 'eager' : 'lazy'}
                    decoding="async"
                    on:load={() => handleImageLoad(item.slug)}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent"></div>
                  <div class="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
                    <span class="bg-[#ff003c] text-white px-2 py-0.5 rounded text-[10px] font-semibold shadow">
                      Uncensored
                    </span>
                    <span class="bg-black/70 {isMobile ? '' : 'backdrop-blur-sm'} text-[#ffb3c6] px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      {item.rating || '0'}
                    </span>
                  </div>
                  <div class="absolute bottom-0 left-0 right-0 p-2">
                    <h3 class="font-semibold text-white text-xs mb-1 line-clamp-2 drop-shadow-lg {isMobile ? '' : 'group-hover:text-[#ffb3c6] transition-colors'}" title={item.seriesTitle}>
                      {item.seriesTitle}
                    </h3>
                    <p class="text-[#ffb3c6] text-[10px] mb-1 drop-shadow">{item.episodeTitle}</p>
                    <div class="flex items-center justify-between">
                      <span class="bg-[#ff003c] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">18+</span>
                      <span class="text-[#ffb3c6] text-[10px]">{item.releaseDate || '--'}</span>
                    </div>
                  </div>
                </div>
              </a>
            {/each}
          </div>
        </section>

        <!-- Recent Series Section -->
        <section id="series" class="mb-8">
          <div class="flex items-center justify-between mb-6 gap-2">
            <div class="flex items-center gap-2 sm:gap-3">
              <div class="w-1 h-7 sm:h-8 bg-[#ff003c] rounded-full flex-shrink-0"></div>
              <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-white">Recent Series</h2>
            </div>
            <a href="/hanime/tvshows" class="see-more-btn flex-shrink-0">
              <span>See More</span>
              <svg class="see-more-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
            {#each recentSeries as item, index}
              <a
                href={`/hanime/info/${item.slug}`}
                class="group relative bg-[#1a0106] rounded-xl overflow-hidden shadow {isMobile ? 'border border-transparent' : 'transition-all duration-150 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40'} cursor-pointer block"
              >
                <div class="relative aspect-[3/4]">
                  {#if !imageLoadedStates[item.slug]}
                    <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                  {/if}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    class="w-full h-full object-cover {imageLoadedStates[item.slug] ? 'opacity-100' : 'opacity-0'}"
                    loading={index < (isMobile ? 6 : 12) ? 'eager' : 'lazy'}
                    decoding="async"
                    on:load={() => handleImageLoad(item.slug)}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent"></div>
                  <div class="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
                    <span class="bg-[#ff003c] text-white px-2 py-0.5 rounded text-[10px] font-semibold shadow">
                      Series
                    </span>
                    <span class="bg-black/70 {isMobile ? '' : 'backdrop-blur-sm'} text-[#ffb3c6] px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      {item.rating || '0'}
                    </span>
                  </div>
                  <div class="absolute bottom-0 left-0 right-0 p-2">
                    <h3 class="font-semibold text-white text-xs mb-1 line-clamp-2 drop-shadow-lg {isMobile ? '' : 'group-hover:text-[#ffb3c6] transition-colors'}" title={item.title}>
                      {item.title}
                    </h3>
                    <div class="flex items-center justify-between">
                      <span class="bg-[#ff003c] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">18+</span>
                      <span class="text-[#ffb3c6] text-[10px]">{item.year || '--'}</span>
                    </div>
                  </div>
                </div>
              </a>
            {/each}
          </div>
        </section>

        <!-- Recent Episodes Section -->
        <section id="episodes" class="mb-8">
          <div class="flex items-center justify-between mb-6 gap-2">
            <div class="flex items-center gap-2 sm:gap-3">
              <div class="w-1 h-7 sm:h-8 bg-[#ff003c] rounded-full flex-shrink-0"></div>
              <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-white">Recent Episodes</h2>
            </div>
            <a href="/hanime/recent-ep" class="see-more-btn flex-shrink-0">
              <span>See More</span>
              <svg class="see-more-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
          
          <div class="grid-responsive">
            {#each recentEpisodes as item, index}
              <a
                href={`/hanime/watch/${item.slug}`}
                class="group relative bg-[#1a0106] rounded-xl overflow-hidden shadow {isMobile ? 'border border-transparent' : 'transition-all duration-150 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40'} cursor-pointer block"
              >
                <div class="relative aspect-[16/9]">
                  {#if !imageLoadedStates[item.slug]}
                    <div class="skeleton-loader w-full h-full absolute inset-0"></div>
                  {/if}
                  <img
                    src={item.imageUrl}
                    alt={item.episodeTitle}
                    class="w-full h-full object-cover {imageLoadedStates[item.slug] ? 'opacity-100' : 'opacity-0'}"
                    loading={index < (isMobile ? 6 : 12) ? 'eager' : 'lazy'}
                    decoding="async"
                    on:load={() => handleImageLoad(item.slug)}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent"></div>
                  <div class="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
                    <span class="bg-[#ff003c] text-white px-2 py-0.5 rounded text-[10px] font-semibold shadow">
                      Episode
                    </span>
                    {#if item.releaseDate}
                      <span class="bg-black/70 {isMobile ? '' : 'backdrop-blur-sm'} text-[#ffb3c6] px-2 py-0.5 rounded text-[10px]">
                        {item.releaseDate}
                      </span>
                    {/if}
                  </div>
                  <div class="absolute bottom-0 left-0 right-0 p-2">
                    <h3 class="font-semibold text-white text-xs mb-1 line-clamp-2 drop-shadow-lg {isMobile ? '' : 'group-hover:text-[#ffb3c6] transition-colors'}" title={item.seriesTitle}>
                      {item.seriesTitle}
                    </h3>
                    <p class="text-[#ffb3c6] text-[10px] drop-shadow">{item.episodeTitle}</p>
                  </div>
                </div>
              </a>
            {/each}
          </div>
        </section>

        {#if error}
          <div class="bg-[#ff003c]/10 border border-[#ff003c]/30 text-[#ff003c] p-6 rounded-xl mb-8 {isMobile ? '' : 'backdrop-blur-sm'}">
            <div class="flex items-center gap-3">
              <svg class="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <div>
                <h3 class="font-semibold text-lg">Error</h3>
                <p class="text-[#ffb3c6] mt-1">{error}</p>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <Footer />
</div>

{#if showWarning}
  <AdultWarning onConfirm={closeWarning} onReject={rejectWarning} />
{/if}

<style>
  /* ─── See More button ─── */
  .see-more-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #ff003c;
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .see-more-btn:hover {
    color: #fff;
    background: #ff003c;
    border-color: #ff003c;
    box-shadow: 0 0 12px rgba(255, 0, 60, 0.45);
  }

  .see-more-btn:hover .see-more-icon {
    transform: translateX(3px);
  }

  .see-more-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    transition: transform 0.25s ease;
  }

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

  /* ─── Monthly grid (8 cols desktop) ─── */
  .grid-monthly {
    display: grid;
    gap: 0.25rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 640px) {
    .grid-monthly {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.25rem;
    }
  }

  @media (min-width: 768px) {
    .grid-monthly {
      grid-template-columns: repeat(8, minmax(0, 1fr));
      gap: 0.25rem;
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