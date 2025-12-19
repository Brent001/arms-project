<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { goto } from '$app/navigation'; // Import goto for navigation

  export let isOpen = false; // Sidebar open state
  export let onClose: () => void; // Function to close the sidebar

  let genres: string[] = []; // Genres fetched from the API
  let loadingGenres = true; // Loading state for genres
  let errorGenres: string | null = null; // Error state for genres
  let showAllGenres = false; // Toggle to show all genres

  // Module-level cache for genres to prevent re-fetching
  let cachedGenres: string[] | null = null;

  // Function to sanitize genre names
  function sanitizeGenreName(genre: string): string {
    return genre
      .toLowerCase() // Convert to lowercase
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, ''); // Remove invalid characters
  }

  async function fetchGenres() {
    // Use cached data if available
    if (cachedGenres) {
      genres = cachedGenres;
      loadingGenres = false;
      return;
    }

    loadingGenres = true;
    errorGenres = null;

    try {
      const response = await fetch('/api/genre/action?page=1'); // Example genre API call
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const json = await response.json();
      if (json.success && Array.isArray(json.data.genres)) {
        genres = json.data.genres;
        cachedGenres = genres; // Cache the result for future use
      } else {
        errorGenres = json.error || 'Failed to fetch genres';
      }
    } catch (err) {
      errorGenres = err instanceof Error ? err.message : 'Failed to fetch genres';
    } finally {
      loadingGenres = false;
    }
  }

  function navigateTo(path: string) {
    goto(path); // Use goto for navigation
    onClose(); // Close the sidebar after navigation
  }

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
    background: rgba(32, 31, 49, 0.8);
    z-index: 1000;
  }

  /* Sidebar */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 80%; /* Default width for desktop */
    max-width: 300px; /* Limit max width */
    height: 100%;
    background: rgba(32, 31, 49, 0.9); /* Original color */
    backdrop-filter: blur(10px) brightness(0.8); /* Frosted glass effect */
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1100;
    overflow-y: auto; /* Enable scrolling */
    scrollbar-width: none; /* Hide scrollbar in Firefox */
  }

  .sidebar::-webkit-scrollbar {
    display: none; /* Hide scrollbar in WebKit browsers */
  }

  /* Menu Items */
  .menu-item {
    width: 100%; /* Make the menu item span the full width of the sidebar */
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1); /* Extend the line across the sidebar */
    font-weight: 600;
    color: #fbbf24; /* orange-400 */
    cursor: pointer;
    transition: color 0.2s ease-in-out, transform 0.2s ease-in-out;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .menu-item:hover {
    color: #ffffff; /* white */
    transform: scale(1.05);
  }

  /* Loading and Error Messages */
  .loading-message,
  .error-message {
    padding: 1rem;
    font-size: 0.875rem;
    color: #fbbf24; /* orange-400 */
  }

  /* Genre Section */
  .genre-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); /* Responsive grid */
    gap: 0.5rem; /* Space between items */
    margin-top: 1rem;
  }

  .genre-link {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: capitalize;
    cursor: pointer;
    transition: color 0.2s ease-in-out, transform 0.2s ease-in-out;
    color: #fbbf24; /* Default color */
    text-align: left; /* Align text to the left */
  }

  .genre-link:hover {
    transform: scale(1.05);
    color: #ffffff; /* Hover color */
  }

  /* Show More Button */
  .show-more-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #fbbf24; /* Default color */
    cursor: pointer;
    margin-top: 1rem;
    transition: color 0.2s ease-in-out, transform 0.2s ease-in-out;
  }

  .show-more-button:hover {
    color: #ffffff; /* Hover color */
    transform: scale(1.05);
  }

  /* Mobile-specific styles */
  @media (max-width: 768px) {
    .sidebar {
      width: 65%; /* Reduce width for mobile */
      max-width: 290px; /* Add this line to limit sidebar width on mobile */
    }

    .menu-item {
      font-size: 0.875rem; /* Smaller font size for mobile */
      padding: 0.75rem; /* Adjust padding for mobile */
    }

    .genre-section {
      grid-template-columns: repeat(2, 1fr); /* Always two columns */
    }

    .genre-link {
      font-size: 0.75rem; /* Smaller font size for mobile */
    }

    .show-more-button {
      font-size: 0.75rem; /* Smaller font size for mobile */
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
        <button class="menu-item" on:click={() => navigateTo('/home')} aria-label="Go to Home">
          Home
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 200 }}>
        <button class="menu-item" on:click={() => navigateTo('/category/subbed-anime')} aria-label="Go to Subbed Anime">
          Subbed Anime
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 250 }}>
        <button class="menu-item" on:click={() => navigateTo('/category/dubbed-anime')} aria-label="Go to Dubbed Anime">
          Dubbed Anime
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 300 }}>
        <button class="menu-item" on:click={() => navigateTo('/category/most-popular')} aria-label="Go to Most Popular">
          Most Popular
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 350 }}>
        <button class="menu-item" on:click={() => navigateTo('/category/movie')} aria-label="Go to Movies">
          Movies
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 400 }}>
        <button class="menu-item" on:click={() => navigateTo('/category/tv')} aria-label="Go to TV Series">
          TV Series
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 450 }}>
        <button class="menu-item" on:click={() => navigateTo('/category/ova')} aria-label="Go to OVAs">
          OVAs
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 500 }}>
        <button class="menu-item" on:click={() => navigateTo('/category/ona')} aria-label="Go to ONAs">
          ONAs
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 550 }}>
        <button class="menu-item" on:click={() => navigateTo('/category/special')} aria-label="Go to Specials">
          Specials
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 575 }}>
        <button class="menu-item" on:click={() => navigateTo('/continue')} aria-label="Continue Watching and Reading">
          Continue
        </button>
      </li>
      <li in:fly={{ x: -100, duration: 300, delay: 600 }}>
        <button class="menu-item" on:click={() => navigateTo('/hanime')} aria-label="Go to Specials">
          Hanime
        </button>
      </li>
    </ul>

    <!-- Genre Section -->
    <div 
      class="text-white mt-4 px-4" 
      style="margin-bottom: 2rem;"
      in:fly={{ y: 50, duration: 400, delay: 650 }}
    >
      <h5 class="text-lg font-bold mb-2">Genres</h5>
      {#if loadingGenres}
        <p class="loading-message" in:fade={{ duration: 200 }}>Loading genres...</p>
      {:else if errorGenres}
        <p class="error-message" in:fade={{ duration: 200 }}>{errorGenres}</p>
      {:else}
        <div class="genre-section">
          {#each (showAllGenres ? genres : genres.slice(0, 10)) as genre, i (genre)}
            <button
              class="genre-link"
              on:click={() => navigateTo(`/genre/${sanitizeGenreName(genre)}`)}
              aria-label={`Go to ${sanitizeGenreName(genre)}`}
              in:fly={{ x: -30, duration: 250, delay: 700 + (i * 30) }}
            >
              {sanitizeGenreName(genre).replace('-', ' ')}
            </button>
          {/each}
        </div>
        {#if genres.length > 10}
          <button 
            class="show-more-button" 
            on:click={() => (showAllGenres = !showAllGenres)}
            in:fly={{ x: -30, duration: 300, delay: 900 }}
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
