<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { goto } from '$app/navigation';

  export let isOpen = false;
  export let onClose: () => void;

  let genres: string[] = [];
  let loadingGenres = true;
  let errorGenres: string | null = null;
  let showAllGenres = false;

  // Module-level cache for genres to prevent re-fetching
  let cachedHanimeGenres: string[] | null = null;

  function sanitizeGenreName(genre: string): string {
    return genre
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  async function fetchGenres() {
    // Use cached data if available
    if (cachedHanimeGenres) {
      genres = cachedHanimeGenres;
      loadingGenres = false;
      return;
    }

    loadingGenres = true;
    errorGenres = null;
    
    try {
      const response = await fetch('/api/hanime/genre/');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const json = await response.json();
      let fetchedGenres: string[] = [];

      // Expecting: { status: 'success', data: { provider, type, data: { genres: [...] } } }
      if (json?.status === 'success' && json?.data?.data?.genres) {
        fetchedGenres = json.data.data.genres;
      } else if (json?.data?.genres) {
        fetchedGenres = json.data.genres;
      } else if (Array.isArray(json)) {
        fetchedGenres = json;
      }

      if (fetchedGenres.length > 0) {
        genres = fetchedGenres;
        cachedHanimeGenres = genres; // Cache the result for future use
      } else {
        errorGenres = 'Could not find genres for the provider';
      }
    } catch (err) {
      errorGenres = err instanceof Error ? err.message : 'Failed to fetch genres';
    } finally {
      loadingGenres = false;
    }
  }

  function navigateTo(path: string) {
    goto(path);
    onClose();
  }

  // Prevent page scroll when sidebar is open
  $: {
    if (typeof window !== 'undefined') {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      document.body.style.overflow = '';
    }
  });

  onMount(() => {
    fetchGenres();
  });
</script>

<style>
  /* Sidebar Overlay */
  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    width: 100vw;
    height: 100vh;
    backdrop-filter: blur(10px);
    background: rgba(42, 0, 8, 0.85); /* Dark red overlay */
    z-index: 1000;
  }

  /* Sidebar */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 80%;
    max-width: 300px;
    height: 100%;
    background: #1a0106; /* Solid color, no gradient */
    backdrop-filter: blur(10px) brightness(0.7);
    box-shadow: 0 4px 16px 0 rgba(255, 0, 60, 0.15);
    z-index: 1100;
    overflow-y: auto;
    scrollbar-width: none;
    border-right: 2px solid #7a2233;
  }

  .sidebar::-webkit-scrollbar {
    display: none;
  }

  /* Menu Items */
  .menu-item {
    width: 100%;
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 0, 60, 0.15);
    font-weight: 600;
    color: #ff4d79; /* Vibrant pink */
    cursor: pointer;
    transition: color 0.2s, transform 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: transparent;
  }

  .menu-item:hover {
    color: #fff;
    background: rgba(255, 0, 60, 0.08);
    transform: scale(1.05);
  }

  /* Loading and Error Messages */
  .loading-message,
  .error-message {
    padding: 1rem;
    font-size: 0.875rem;
    color: #ff4d79;
  }

  /* Genre Section */
  .genre-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .genre-link {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: capitalize;
    cursor: pointer;
    transition: color 0.2s, transform 0.2s;
    color: #ffb3c6;
    text-align: left;
    background: transparent;
    border-radius: 0.375rem;
    padding: 0.25rem 0.5rem;
  }

  .genre-link:hover {
    transform: scale(1.05);
    color: #fff;
    background: #ff003c;
  }

  /* Show More Button */
  .show-more-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #ff4d79;
    cursor: pointer;
    margin-top: 1rem;
    transition: color 0.2s, transform 0.2s;
    background: transparent;
  }

  .show-more-button:hover {
    color: #fff;
    transform: scale(1.05);
  }

  /* Mobile-specific styles */
  @media (max-width: 768px) {
    .sidebar {
      width: 65%;
      max-width: 300px;
    }

    .menu-item {
      font-size: 0.875rem;
      padding: 0.75rem;
    }

    .genre-section {
      grid-template-columns: repeat(2, 1fr);
    }

    .genre-link {
      font-size: 0.75rem;
    }

    .show-more-button {
      font-size: 0.75rem;
    }
  }
</style>

{#if isOpen}
  <button 
    class="sidebar-overlay" 
    on:click={onClose} 
    aria-label="Close sidebar"
    transition:fade={{ duration: 300 }}
  ></button>
{/if}

{#if isOpen}
  <div 
    class="sidebar"
    transition:fly={{ x: -300, duration: 350, opacity: 0.8 }}
  >
    <!-- Close Button -->
    <div class="px-4 py-3 border-b border-gray-700">
      <button
        on:click={onClose}
        class="text-white flex items-center gap-2 px-3 py-2 transition"
        in:fly={{ x: -50, duration: 400, delay: 100 }}
      >
        <!-- Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>Close Menu</span>
      </button>
    </div>

    <!-- Menu Items -->
    <ul class="text-white">
      <li in:fly={{ x: -100, duration: 300, delay: 150 }}>
        <button class="menu-item" on:click={() => navigateTo('/hanime')} aria-label="Go to Hanime Home">
          Home
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 175 }}>
        <button class="menu-item" on:click={() => navigateTo('/hanime/studios')} aria-label="Go to Random Hanime">
          Studios
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 200 }}>
        <button class="menu-item" on:click={() => navigateTo('/hanime/tvshows')} aria-label="Go to TV Shows">
          TV Shows
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 200 }}>
        <button class="menu-item" on:click={() => navigateTo('/hanime/monthly-releases')} aria-label="Go to Studios">
          New Releases
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 225 }}>
        <button class="menu-item" on:click={() => navigateTo('/home')} aria-label="Go to Home">
          Exit Hanime
        </button>
      </li>
    </ul>

    <!-- Genre Section -->
    <div 
      class="text-white mt-4 px-4" 
      style="margin-bottom: 2rem;"
      in:fly={{ y: 50, duration: 400, delay: 250 }}
    >
      <h5 class="text-lg font-bold mb-2">Genres</h5>
      {#if loadingGenres}
        <p class="loading-message" in:fade={{ duration: 200 }}>Loading genres...</p>
      {:else if errorGenres}
        <p class="error-message" in:fade={{ duration: 200 }}>{errorGenres}</p>
      {:else}
        <div class="genre-section">
          {#each (showAllGenres ? genres : genres.slice(0, 26)) as genre, i (genre)}
            <button
              class="genre-link"
              on:click={() => navigateTo(`/hanime/genre/${sanitizeGenreName(genre)}`)}
              aria-label={`Go to ${sanitizeGenreName(genre)}`}
              in:fly={{ x: -30, duration: 250, delay: 300 + (i * 30) }}
            >
              {sanitizeGenreName(genre).replace('-', ' ')}
            </button>
          {/each}
        </div>
        {#if genres.length > 10}
          <button 
            class="show-more-button" 
            on:click={() => (showAllGenres = !showAllGenres)}
            in:fly={{ x: -30, duration: 300, delay: 500 }}
          >
            {#if showAllGenres}
              <!-- Icon for "Show Less" -->
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
              </svg>
              Show Less
            {:else}
              <!-- Icon for "Show More" -->
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Show More
            {/if}
          </button>
        {/if}
      {/if}
    </div>
  </div>
{/if}