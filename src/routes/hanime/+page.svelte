<script lang="ts">
  import { onMount } from 'svelte';
  import Navbar from '$lib/components/hanime/Navbar.svelte';
  import Footer from '$lib/components/hanime/Footer.svelte';
  import AdultWarning from '$lib/components/hanime/AdultWarning.svelte';

  let trending: any[] = [];
  let recent: any[] = [];
  let loading = true;
  let error: string | null = null;
  let showWarning = true;

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

  onMount(async () => {
    // Check cookie or localStorage for 18+ confirmation
    if (
      (typeof document !== 'undefined' && getCookie('arms18plus') === 'yes') ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('arms18plus') === 'yes')
    ) {
      showWarning = false;
    }
    try {
      const [trendingRes, recentRes] = await Promise.all([
        fetch('/api/hanime/trending'),
        fetch('/api/hanime/recent')
      ]);
      const trendingJson = await trendingRes.json();
      const recentJson = await recentRes.json();

      if (trendingJson.status === 'success') {
        trending = trendingJson.data.results;
      }
      if (recentJson.status === 'success') {
        recent = recentJson.data.results;
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
</script>

<svelte:head>
  <title>Home | ARMS Hentai</title>
  <meta name="description" content="Explore premium adult anime for mature audiences. Trending & new series, updated daily." />
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
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Professional Hero Section -->
        <section class="relative mb-10">
          <div class="relative bg-gradient-to-r from-[#2a0008] via-[#3a0d16] to-[#2a0008] rounded-2xl overflow-hidden shadow-xl border border-[#ff003c]/20 px-4 py-8 sm:px-8 sm:py-10">
            <div class="absolute inset-0 bg-[url('https://i.imgur.com/4M7IWwP.jpg')] bg-cover bg-center opacity-10"></div>
            <div class="relative z-10 flex flex-col items-center text-center gap-3">
              <div class="flex items-center justify-center mb-2">
                <div class="bg-[#ff003c]/10 p-2 rounded-xl border border-[#ff003c]/30">
                  <svg class="w-8 h-8 text-[#ff003c]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
              </div>
              <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white flex items-center justify-center gap-2">
                ARMS <span class="text-[#ff003c]">Adult</span>
                <span class="inline-block bg-[#ff003c] text-black text-xs sm:text-sm px-2 py-0.5 rounded-full font-bold">18+</span>
              </h1>
              <p class="text-base sm:text-lg text-[#ffb3c6] font-light max-w-xl mx-auto leading-snug">
                Premium adult anime for mature audiences.<br>
                <span class="text-sm">Trending & new series, updated daily.</span>
              </p>
              <div class="flex flex-col gap-2 mt-2 w-full max-w-xs sm:max-w-none sm:flex-row sm:justify-center">
                <a href="#trending"
                   class="bg-black/80 hover:bg-[#ff003c] text-[#ff003c] hover:text-black font-bold px-4 py-2 rounded-lg shadow border border-[#ff003c] text-xs sm:text-base w-full sm:w-auto transition">
                  See Trending
                </a>
                <a href="#recent"
                   class="bg-[#ff003c] hover:bg-[#c2002e] text-black font-bold px-4 py-2 rounded-lg shadow ring-2 ring-[#ff003c]/40 text-xs sm:text-base w-full sm:w-auto transition">
                  Browse Recent
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- Trending Section -->
        <section id="trending" class="mb-16">
          <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-3">
              <div class="w-1 h-8 bg-[#ff003c] rounded-full"></div>
              <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Trending Now</h2>
              <span class="bg-[#ff003c]/20 text-[#ff003c] px-3 py-1 rounded-full text-sm font-medium">
                {trending.length} items
              </span>
            </div>
          </div>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-2 lg:gap-2">
            {#each trending as item, index}
              <a
                href={`/hanime/info/${item.id}`}
                class="group relative bg-[#1a0106] rounded-xl overflow-hidden shadow transition-transform duration-200 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40 cursor-pointer block hover:scale-[1.03]"
              >
                <div class="relative aspect-[3/4]">
                  <img
                    src={item.image}
                    alt={item.title}
                    class="w-full h-full object-cover"
                    loading={index < 12 ? 'eager' : 'lazy'}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div class="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
                    <span class="bg-[#ff003c] text-white px-2 py-0.5 rounded text-[10px] font-semibold shadow">
                      Trending
                    </span>
                    <span class="bg-black/70 backdrop-blur-sm text-[#ffb3c6] px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 18.657l-6.828-6.829a4 4 0 010-5.656z"/>
                      </svg>
                      {item.views?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div class="absolute bottom-0 left-0 right-0 p-2">
                    <h3 class="font-semibold text-white text-xs mb-1 line-clamp-2 group-hover:text-[#ffb3c6] transition-colors" title={item.title}>
                      {item.title}
                    </h3>
                    <div class="flex items-center justify-between">
                      <span class="bg-[#ff003c] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">18+</span>
                      <span class="text-[#ffb3c6] text-[10px]">{item.duration || '--:--'}</span>
                    </div>
                  </div>
                </div>
              </a>
            {/each}
          </div>
        </section>

        <!-- Recent Section -->
        <section id="recent" class="mb-16">
          <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-">
              <div class="w-1 h-8 bg-[#ff003c] rounded-full"></div>
              <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Recently Added</h2>
              <span class="bg-[#ff003c]/20 text-[#ff003c] px-3 py-1 rounded-full text-sm font-medium">
                {recent.length} items
              </span>
            </div>
          </div>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-2 lg:gap-2">
            {#each recent as item, index}
              <a
                href={`/hanime/info/${item.id}`}
                class="group relative bg-[#1a0106] rounded-xl overflow-hidden shadow transition-all duration-150 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40 cursor-pointer block"
              >
                <div class="relative aspect-[3/4]">
                  <img
                    src={item.image}
                    alt={item.title}
                    class="w-full h-full object-cover"
                    loading={index < 12 ? 'eager' : 'lazy'}
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div class="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
                    <span class="bg-[#ff003c] text-white px-2 py-0.5 rounded text-[10px] font-semibold shadow">
                      New
                    </span>
                    <span class="bg-black/70 backdrop-blur-sm text-[#ffb3c6] px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 18.657l-6.828-6.829a4 4 0 010-5.656z"/>
                      </svg>
                      {item.views?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div class="absolute bottom-0 left-0 right-0 p-2">
                    <h3 class="font-semibold text-white text-xs mb-1 line-clamp-2 group-hover:text-[#ffb3c6] transition-colors" title={item.title}>
                      {item.title}
                    </h3>
                    <div class="flex items-center justify-between">
                      <span class="bg-[#ff003c] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">18+</span>
                      <span class="text-[#ffb3c6] text-[10px]">{item.duration || '--:--'}</span>
                    </div>
                  </div>
                </div>
              </a>
            {/each}
          </div>
        </section>

        {#if error}
          <div class="bg-[#ff003c]/10 border border-[#ff003c]/30 text-[#ff003c] p-6 rounded-xl mb-8 backdrop-blur-sm">
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
  
  @keyframes fade-in {
    from { 
      opacity: 0; 
      transform: scale(0.95) translateY(20px);
    }
    to { 
      opacity: 1; 
      transform: scale(1) translateY(0);
    }
  }
  

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-clamp: 2; /* Add this line for compatibility */
  }
  
  /* Home-style border animation on hover */
  .group {
    border: 2px solid transparent;
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .group:hover {
    border-color: #ff003c;
    box-shadow: 0 0 0 2px #ff003c44, 0 4px 24px #ff003c22;
  }
  
  /* Backdrop blur support */
  @supports (backdrop-filter: blur(10px)) {
    .backdrop-blur-sm {
      backdrop-filter: blur(4px);
    }
  }
</style>
