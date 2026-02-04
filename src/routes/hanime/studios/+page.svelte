<script lang="ts">
  import { onMount } from 'svelte';
  import Navbar from '$lib/components/hanime/Navbar.svelte';
  import Footer from '$lib/components/hanime/Footer.svelte';

  export let data; // Data from +page.ts

  let brands: { id: number; name: string; slug: string }[] = [];
  let filteredBrands: { id: number; name: string; slug: string }[] = [];
  let error: string | null = null;
  let loading = true;
  let isMobile = false;
  let searchTerm = '';
  let selectedLetter = 'ALL';

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const allLetters = ['ALL', ...alphabet, '#'];

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

    // Assign data from load function
    // Handle both direct brands array and nested response format
    try {
      if (data && typeof data === 'object') {
        const sourceData = data.results ?? data.brands ?? [];
        if (Array.isArray(sourceData) && sourceData.length > 0) {
          brands = sourceData;
        }
        error = data.error || null;
      }
    } catch (err) {
      console.error('Error processing data:', err);
      error = 'Failed to process studio data';
      brands = [];
    }
    
    loading = false;

    // Initialize filteredBrands with sorted brands or handle initial error
    if (!error && brands.length > 0) {
      filteredBrands = [...brands].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      filteredBrands = [];
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  // Reactive statement for filtering and sorting
  $: {
    let result = [...brands];

    // Filter by search term
    if (searchTerm) {
      result = result.filter(brand =>
        brand.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by letter
    if (selectedLetter !== 'ALL') {
      if (selectedLetter === '#') {
        result = result.filter(brand => !/^[a-zA-Z]/.test(brand.name));
      } else {
        result = result.filter(brand =>
          brand.name.toUpperCase().startsWith(selectedLetter)
        );
      }
    }

    filteredBrands = result.sort((a, b) => a.name.localeCompare(b.name));
  }

  function selectLetter(letter: string) {
    selectedLetter = letter;
    searchTerm = ''; // Clear search when selecting a letter
  }

  // Sanitize slug to convert to URL-friendly format (e.g., "Green Bunny" -> "green-bunny")
  function sanitizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
</script>

<svelte:head>
  <title>Studios | ARMS Hentai</title>
  <meta name="description" content="Explore a comprehensive list of hentai studios and production companies on ARMS Hentai." />
  {#if isMobile}
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
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
        <!-- Studios List Section -->
        <section id="studios-list" class="mb-12">
          <div class="mb-2 flex items-center gap-3 mt-4">
            <div class="w-1 h-7 sm:h-8 bg-[#ff003c] rounded-full"></div>
            <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-white">Browse Studios</h2>
            <span class="bg-[#ff003c]/20 text-[#ff003c] px-3 py-1 rounded-full text-sm font-medium">
                {filteredBrands.length} items
            </span>
          </div>

          <div class="mb-6">
            <input
              type="text"
              bind:value={searchTerm}
              placeholder="Search for a studio..."
              class="w-full p-3 rounded-lg bg-[#3a0d16] border border-[#ff003c]/30 text-white placeholder-[#ffb3c6] focus:outline-none focus:ring-2 focus:ring-[#ff003c]"
            />
          </div>

          <!-- Alphabetical Filter -->
          <div class="mb-6 bg-[#1a0106]/50 p-2 sm:p-3 rounded-lg border border-[#ff003c]/20">
            <div class="alphabet-scroll {isMobile ? '' : 'flex flex-wrap gap-1.5 justify-center'}">
              {#each allLetters as letter}
                <button
                  on:click={() => selectLetter(letter)}
                  class="letter-btn {selectedLetter === letter ? 'active' : ''}"
                >
                  {letter}
                </button>
              {/each}
            </div>
          </div>
          
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
          {:else if filteredBrands.length === 0 && (searchTerm || selectedLetter !== 'ALL')}
            <div class="bg-blue-600/10 border border-blue-600/30 text-blue-400 p-6 rounded-xl mb-8 {isMobile ? '' : 'backdrop-blur-sm'}">
              <div class="flex items-center gap-3">
                <svg class="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.332a.75.75 0 01.947-.464l4.975 1.777c.365.13.567.502.503.883L14.47 11.25h3.375c.621 0 1.125.504 1.125 1.125v.375c0 .621-.504 1.125-1.125 1.125h-3.375L13.9 20.325a.75.75 0 01-1.01.594l-4.975-1.777a.75.75 0 01-.503-.883L9.53 12.75H6.155a.75.75 0 01-.703-.548L4.25 8.751A.75.75 0 014.25 7.25l1.202-3.203a.75.75 0 01.691-.498L8.257 3.332zm1.258 4.717a.75.75 0 01-.94-.465L7.75 5.51l-.707 1.884c-.052.14-.14.258-.256.347a.75.75 0 01-.926-.145L4.098 5.751a.75.75 0 01.378-.99l4.975-1.777c.365-.13.567-.502.503-.883L9.362 3.75h3.375c.621 0 1.125.504 1.125 1.125v.375c0 .621-.504 1.125-1.125 1.125h-3.375L9.638 8.049z" clip-rule="evenodd" />
                </svg>
                <div>
                  <h3 class="font-semibold text-lg">No matching studios found</h3>
                  <p class="text-blue-200 mt-1">Try a different search term or filter.</p>
                </div>
              </div>
            </div>
          {:else if filteredBrands.length === 0}
            <div class="bg-blue-600/10 border border-blue-600/30 text-blue-400 p-6 rounded-xl mb-8 {isMobile ? '' : 'backdrop-blur-sm'}">
              <div class="flex items-center gap-3">
                <svg class="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.332a.75.75 0 01.947-.464l4.975 1.777c.365.13.567.502.503.883L14.47 11.25h3.375c.621 0 1.125.504 1.125 1.125v.375c0 .621-.504 1.125-1.125 1.125h-3.375L13.9 20.325a.75.75 0 01-1.01.594l-4.975-1.777a.75.75 0 01-.503-.883L9.53 12.75H6.155a.75.75 0 01-.703-.548L4.25 8.751A.75.75 0 014.25 7.25l1.202-3.203a.75.75 0 01.691-.498L8.257 3.332zm1.258 4.717a.75.75 0 01-.94-.465L7.75 5.51l-.707 1.884c-.052.14-.14.258-.256.347a.75.75 0 01-.926-.145L4.098 5.751a.75.75 0 01.378-.99l4.975-1.777c.365-.13.567-.502.503-.883L9.362 3.75h3.375c.621 0 1.125.504 1.125 1.125v.375c0 .621-.504 1.125-1.125 1.125h-3.375L9.638 8.049z" clip-rule="evenodd" />
                </svg>
                <div>
                  <h3 class="font-semibold text-lg">No Studios Found</h3>
                  <p class="text-blue-200 mt-1">It seems there are no studios to display at the moment.</p>
                </div>
              </div>
            </div>
          {:else}
            <div class="studios-list-grid">
              {#each filteredBrands as brand (brand.id)}
                <a
                  href={`/hanime/studio/${sanitizeSlug(brand.slug)}`}
                  class="studio-item group relative bg-[#1a0106] p-2.5 rounded-lg overflow-hidden shadow-md
                         {isMobile ? 'border border-transparent' : 'transition-transform duration-200 border border-transparent hover:border-[#ff003c] hover:shadow-[#ff003c]/40 hover:scale-[1.02]'}
                         cursor-pointer block text-center flex items-center justify-center min-h-[50px]"
                >
                  <span class="font-semibold text-white text-sm line-clamp-2 {isMobile ? '' : 'group-hover:text-[#ffb3c6] transition-colors'}" title={brand.name}>
                    {brand.name}
                  </span>
                </a>
              {/each}
            </div>
          {/if}
        </section>
      </div>
    </div>
  {/if}

  <Footer />
</div>

<style>
  /* Responsive container with proper max-width scaling */
  .container-custom {
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }

  @media (min-width: 640px) {
    .container-custom {
      padding-left: 1rem;
      padding-right: 1rem;
    }
  }

  @media (min-width: 1024px) {
    .container-custom {
      max-width: 1280px;
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }
  }

  @media (min-width: 1280px) {
    .container-custom {
      max-width: 1536px;
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }
  }

  @media (min-width: 1536px) {
    .container-custom {
      max-width: 1792px;
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }
  }

  @media (min-width: 1920px) {
    .container-custom {
      max-width: 1920px;
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }
  }

  /* Letter filter buttons */
  .letter-btn {
    min-width: 32px;
    height: 32px;
    padding: 0 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 600;
    color: #ffb3c6;
    background-color: #3a0d16;
    border: 1px solid #ff003c33;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .letter-btn:hover {
    background-color: #ff003c22;
    border-color: #ff003c66;
    color: #fff;
  }

  .letter-btn.active {
    background-color: #ff003c;
    border-color: #ff003c;
    color: #fff;
    box-shadow: 0 0 0 2px #ff003c44;
  }

  /* Mobile horizontal scroll for alphabet */
  @media (max-width: 767px) {
    .alphabet-scroll {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: #ff003c #3a0d16;
      padding-bottom: 8px;
    }

    .alphabet-scroll::-webkit-scrollbar {
      height: 6px;
    }

    .alphabet-scroll::-webkit-scrollbar-track {
      background: #3a0d16;
      border-radius: 3px;
    }

    .alphabet-scroll::-webkit-scrollbar-thumb {
      background: #ff003c;
      border-radius: 3px;
    }

    .alphabet-scroll::-webkit-scrollbar-thumb:hover {
      background: #ff1a52;
    }

    .letter-btn {
      min-width: 36px;
      height: 36px;
      font-size: 0.875rem;
    }
  }

  /* Responsive grid for studios list, more compact */
  .studios-list-grid {
    display: grid;
    gap: 0.375rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 640px) {
    .studios-list-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
    }
  }

  @media (min-width: 768px) {
    .studios-list-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.5rem;
    }
  }

  @media (min-width: 1024px) {
    .studios-list-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.5rem;
    }
  }

  @media (min-width: 1280px) {
    .studios-list-grid {
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 0.5rem;
    }
  }

  @media (min-width: 1536px) {
    .studios-list-grid {
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 0.5rem;
    }
  }

  @media (min-width: 1920px) {
    .studios-list-grid {
      grid-template-columns: repeat(8, minmax(0, 1fr));
      gap: 0.5rem;
    }
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-clamp: 2;
  }
  
  /* Desktop-only styles */
  @media (min-width: 768px) {
    .studio-item {
      border: 2px solid transparent;
      transition: border-color 0.3s, box-shadow 0.3s;
    }
    .studio-item:hover {
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