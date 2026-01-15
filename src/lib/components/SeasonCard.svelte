<script lang="ts">
  export let season: {
    id: string;
    poster: string;
    title?: string;
    name?: string;
    isCurrent?: boolean;
  };
  export let imageLoadedStates: { [key: string]: boolean } = {};
  export let onImageLoad: (id: string) => void = () => {};

  function safeTruncate(str: string | undefined | null, maxLength: number = 100): string {
    if (!str || typeof str !== 'string') return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }

  function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset.errorHandled) {
      img.dataset.errorHandled = 'true';
      img.onerror = null; // Prevent infinite loop
    }
  }
</script>

<a
  href={`/info/${encodeURIComponent(season.id)}`}
  class="group relative bg-gray-800 rounded-lg overflow-hidden border-2
    {season.isCurrent ? 'border-orange-400 shadow-lg shadow-orange-400/20' : 'border-gray-700'}
    flex items-end min-h-[72px] transition-all duration-200"
>
  <div class="absolute inset-0">
    {#if !imageLoadedStates[`season-${season.id}`]}
      <div class="skeleton-loader absolute inset-0"></div>
    {/if}
    <img
      src={season.poster}
      alt={safeTruncate(season.title ?? season.name, 30)}
      class="w-full h-full object-cover {imageLoadedStates[`season-${season.id}`] ? 'opacity-100' : 'opacity-0'}"
      loading="lazy"
      on:error={handleImageError}
      on:load={() => onImageLoad(`season-${season.id}`)}
    />
    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent"></div>
  </div>
  {#if season.isCurrent}
    <div
      class="absolute top-2 right-2 bg-orange-400 text-gray-900 px-2 py-1 rounded-full text-xs font-bold z-10"
    >
      Current
    </div>
  {/if}
  <div class="relative w-full p-2 flex items-center justify-center">
    <span
      class="text-white font-semibold text-sm drop-shadow-lg text-center w-full break-words leading-tight"
    >
      {safeTruncate(season.title ?? season.name, 40)}
    </span>
  </div>
</a>

<style>
  /* Skeleton Loader Animation */
  .skeleton-loader {
    background: linear-gradient(
      90deg,
      #374151 0%, /* gray-700 */
      #4b5563 20%, /* gray-600 */
      #374151 40%, /* gray-700 */
      #374151 100%
    );
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
  }

  @keyframes skeleton-loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>