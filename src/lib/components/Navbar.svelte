<script lang="ts">
  import NavBarSidebar from '$lib/components/NavBar-Sidebar.svelte';

  let mobileMenuOpen = false;
  let mobileSearchOpen = false;
  let searchQuery = '';
  let isOpen = false;

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
    if (mobileMenuOpen) mobileSearchOpen = false;
  }

  function toggleMobileSearch() {
    mobileSearchOpen = !mobileSearchOpen;
    if (mobileSearchOpen) mobileMenuOpen = false;
  }

  function closeAll() {
    mobileMenuOpen = false;
    mobileSearchOpen = false;
  }

  function toggleSidebar() {
    isOpen = !isOpen;
  }

  async function handleSearch(event: Event) {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    // Unified search: always go to /search?q=...
    window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
  }
</script>

<nav class="fixed top-0 left-0 w-full z-50 bg-gray-900/80 backdrop-blur-md shadow">
  <div class="w-full mx-auto flex items-center justify-between px-4 lg:px-6 xl:px-8 py-2">
    <!-- Left: Logo & Hamburger -->
    <div class="flex items-center gap-3 z-50 flex-shrink-0">
      <!-- Hamburger Icon -->
      <button class="p-2" on:click={toggleSidebar} aria-label="Toggle sidebar">
        <svg class="h-6 w-6 text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>
      <!-- Logo -->
      <a href="/home" class="flex items-center gap-2" on:click={closeAll}>
        <img src="/assets/logo.png" alt="ARMS Logo" class="h-9 w-9 object-contain rounded z-50" />
        <span class="text-xl font-black text-orange-400 tracking-wide">ARMS</span>
      </a>
    </div>

    <!-- Center/Right: Desktop Search Bar -->
    <div class="flex items-center gap-3 flex-1 justify-end ml-4">
      <!-- Desktop Search Bar - Centered with max width -->
      <form class="hidden md:flex items-center relative w-full max-w-md" on:submit={handleSearch}>
        <input
          class="w-full h-10 rounded bg-gray-800 text-white pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Search anime or manga..."
          type="text"
          bind:value={searchQuery}
        />
        <button type="submit" class="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Search">
          <svg class="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </form>
      <!-- Mobile Search Button -->
      <button class="md:hidden p-2 flex-shrink-0" on:click={toggleMobileSearch} aria-label="Open search">
        <svg class="h-6 w-6 text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Mobile Search Bar -->
  {#if mobileSearchOpen}
    <div class="md:hidden bg-gray-900 px-4 py-2 border-t border-gray-800 animate-fade-in-down">
      <form class="flex items-center relative" on:submit={handleSearch}>
        <input
          class="w-full h-10 rounded bg-gray-800 text-white pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Search anime or manga..."
          type="text"
          bind:value={searchQuery}
        />
        <button type="submit" class="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Search">
          <svg class="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </form>
    </div>
  {/if}
</nav>

<!-- Sidebar -->
<NavBarSidebar {isOpen} onClose={() => (isOpen = false)} />

<style>
  .animate-fade-in-down {
    animation: fade-in-down 0.2s;
  }
  @keyframes fade-in-down {
    from { opacity: 0; transform: translateY(-10px);}
    to { opacity: 1; transform: translateY(0);}
  }
</style>