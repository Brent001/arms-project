<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  export let animes: any[] = [];
  export let intervalMs: number = 10000;
  export let onWatch: (id: string) => void = () => {};

  let carouselIndex = 0;
  let carouselInterval: any = null;
  let isTransitioning = false;

  function resetInterval() {
    clearInterval(carouselInterval);
    carouselInterval = setInterval(() => {
      if (animes?.length > 0 && !isTransitioning) {
        isTransitioning = true;
        carouselIndex = (carouselIndex + 1) % animes.length;
        setTimeout(() => {
          isTransitioning = false;
        }, 800);
      }
    }, intervalMs);
  }

  function prevSlide() {
    if (animes?.length > 0 && !isTransitioning) {
      isTransitioning = true;
      carouselIndex = (carouselIndex - 1 + animes.length) % animes.length;
      setTimeout(() => {
        isTransitioning = false;
      }, 800);
      resetInterval();
    }
  }
  
  function nextSlide() {
    if (animes?.length > 0 && !isTransitioning) {
      isTransitioning = true;
      carouselIndex = (carouselIndex + 1) % animes.length;
      setTimeout(() => {
        isTransitioning = false;
      }, 800);
      resetInterval();
    }
  }

  onMount(() => {
    resetInterval();
    return () => clearInterval(carouselInterval);
  });

  onDestroy(() => {
    clearInterval(carouselInterval);
  });
</script>

<div class="relative w-full max-w-[1800px] mx-auto rounded-lg overflow-hidden shadow-2xl min-h-[220px] sm:min-h-[420px] flex items-center bg-black">
  {#each animes as anime, i (anime.id)}
    <div
      class="carousel-slide {i === carouselIndex ? 'active' : i === (carouselIndex - 1 + animes.length) % animes.length ? 'prev' : i === (carouselIndex + 1) % animes.length ? 'next' : ''}"
    >
      {#if Math.abs(i - carouselIndex) <= 1 || (i === 0 && carouselIndex === animes.length - 1) || (i === animes.length - 1 && carouselIndex === 0) || i === carouselIndex}
        <a href={`/info/${anime.id}`} class="block group relative w-full h-[220px] sm:h-[420px]">
          <div class="absolute inset-0 w-full h-full image-container">
            <img
              src={anime.poster}
              alt={anime.name}
              class="w-full h-full object-cover rounded-lg carousel-image"
              style="object-position:center;"
              draggable="false"
            />
            <div class="absolute inset-0 bg-gradient-to-tr from-black/90 via-black/60 to-transparent rounded-lg pointer-events-none gradient-overlay"></div>
          </div>
          <div class="absolute left-3 sm:left-6 bottom-3 sm:bottom-10 z-10 max-w-[calc(100vw-120px)] sm:max-w-[60%] flex flex-col gap-1 sm:gap-3 content-container">
            <h2 class="text-white text-lg sm:text-3xl md:text-4xl font-bold truncate drop-shadow anime-title">{anime.name}</h2>
            <div class="flex gap-2 sm:gap-3 text-white text-xs sm:text-base font-medium anime-badges">
              <span class="flex items-center gap-1 bg-orange-400 text-gray-900 px-2 sm:px-3 py-1 rounded-full text-xs font-bold shadow rank-badge">
                Rank #{anime.rank}
              </span>
              <span class="flex items-center gap-1 bg-gray-900 text-orange-300 px-2 sm:px-3 py-1 rounded text-xs episode-badge">
                {anime.episodes.sub} Sub / {anime.episodes.dub} Dub
              </span>
            </div>
            <p class="text-gray-200 text-xs sm:text-sm md:text-base drop-shadow anime-description">
              {anime.description ?? ''}
            </p>
          </div>
          <button
            class="absolute right-3 sm:right-10 bottom-3 sm:bottom-10 z-10 flex items-center gap-2 sm:gap-3 bg-orange-400 text-gray-900 font-bold rounded-lg px-4 sm:px-8 py-2 sm:py-4 text-xs sm:text-lg shadow-lg hover:bg-orange-500 transition watch-button"
            title="Watch now"
            on:click|preventDefault={() => onWatch(anime.id)}
          >
            <svg class="w-5 h-5 sm:w-6 sm:h-6 play-icon" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l12 6-12 6V4z"/></svg>
            <span class="hidden sm:inline">WATCH NOW</span>
          </button>
        </a>
      {/if}
    </div>
  {/each}
  <!-- Carousel Controls -->
  <button
    on:click={prevSlide}
    aria-label="Previous Slide"
    class="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-orange-400 text-white hover:text-gray-900 rounded-full w-8 sm:w-14 h-8 sm:h-14 flex items-center justify-center shadow-lg transition z-10 border-2 border-white/10 hover:border-orange-400 carousel-control"
  >
    <svg class="w-5 h-5 sm:w-8 sm:h-8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
  </button>
  <button
    on:click={nextSlide}
    aria-label="Next Slide"
    class="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-orange-400 text-white hover:text-gray-900 rounded-full w-8 sm:w-14 h-8 sm:h-14 flex items-center justify-center shadow-lg transition z-10 border-2 border-white/10 hover:border-orange-400 carousel-control"
  >
    <svg class="w-5 h-5 sm:w-8 sm:h-8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
  </button>
  <!-- Dots -->
  <div class="dots-container">
    {#each animes as _, i}
      <span class="carousel-dot {i === carouselIndex ? 'active' : ''}"></span>
    {/each}
  </div>
</div>

<style>
  .carousel-dot {
    width: 0.60rem;      /* reduced from 0.75rem */
    height: 0.60rem;     /* reduced from 0.75rem */
    border-radius: 9999px;
    border: 2px solid #fbbf24; /* orange-400 */
    background: #1f2937; /* gray-800 */
    margin: 0 0.12rem;  /* slightly reduced margin */
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0.6;
    transform: scale(1);
    display: inline-block;
    cursor: pointer;
  }
  
  .carousel-dot.active {
    background: #fbbf24;
    opacity: 1;
    transform: scale(1.25);
    box-shadow: 0 0 0 2px #fff2, 0 0 20px rgba(251, 191, 36, 0.3);
  }
  
  .carousel-slide {
    transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    will-change: transform, opacity;
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0; 
    left: 0;
    opacity: 0;
    z-index: 0;
    pointer-events: none;
  }
  
  .carousel-slide.active {
    opacity: 1;
    z-index: 2;
    pointer-events: auto;
    transform: translateX(0);
  }
  
  .carousel-slide.prev {
    opacity: 1;
    z-index: 1;
    transform: translateX(-100%);
  }
  
  .carousel-slide.next {
    opacity: 1;
    z-index: 1;
    transform: translateX(100%);
  }
  
  /* Default position for non-adjacent slides */
  .carousel-slide:not(.active):not(.prev):not(.next) {
    opacity: 0;
    transform: translateX(200%);
  }

  .carousel-slide.active .image-container {
    animation: imageZoom 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  @keyframes imageZoom {
    0% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }

  .carousel-slide.active .content-container {
    animation: contentSlideUp 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s both;
  }

  @keyframes contentSlideUp {
    0% {
      transform: translateY(30px);
      opacity: 0;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .carousel-slide.active .anime-title {
    animation: titleSlideIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both;
  }

  @keyframes titleSlideIn {
    0% {
      transform: translateX(-30px);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .carousel-slide.active .anime-badges {
    animation: badgesSlideIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s both;
  }

  @keyframes badgesSlideIn {
    0% {
      transform: translateX(-20px);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .carousel-slide.active .anime-description {
    animation: descriptionFadeIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s both;
  }

  @keyframes descriptionFadeIn {
    0% {
      opacity: 0;
      transform: translateY(10px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Enhanced description styling with proper line clamping */
  .anime-description {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-wrap: break-word;
    word-break: break-word;
    line-height: 1.4;
    max-height: 2.8em; /* 2 lines on mobile */
    -webkit-line-clamp: 2;
    line-clamp: 2; /* add this */
  }

  /* Desktop and larger screens */
  @media (min-width: 640px) {
    .anime-description {
      max-height: 4.2em; /* 3 lines on desktop */
      -webkit-line-clamp: 3;
      line-clamp: 3; /* add this */
      line-height: 1.4;
    }
  }

  /* Large desktop screens */
  @media (min-width: 1024px) {
    .anime-description {
      max-height: 4.2em; /* keep 3 lines on large screens too */
      -webkit-line-clamp: 3;
      line-clamp: 3; /* add this */
    }
  }

  /* Fallback for browsers that don't support line-clamp */
  @supports not (-webkit-line-clamp: 2) {
    .anime-description {
      max-height: 2.8em;
      overflow: hidden;
      position: relative;
    }
    
    .anime-description::after {
      content: '...';
      position: absolute;
      bottom: 0;
      right: 0;
      background: linear-gradient(to right, transparent, #000 50%);
      padding-left: 1rem;
    }
    
    @media (min-width: 640px) {
      .anime-description {
        max-height: 4.2em;
      }
    }
    
    @media (min-width: 1024px) {
      .anime-description {
        max-height: 4.2em;
      }
    }
  }

  .carousel-slide.active .watch-button {
    animation: buttonBounceIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.5s both;
  }

  @keyframes buttonBounceIn {
    0% {
      transform: scale(0.8) translateY(20px);
      opacity: 0;
    }
    60% {
      transform: scale(1.05) translateY(-5px);
      opacity: 0.8;
    }
    100% {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }

  .watch-button:hover .play-icon {
    animation: playIconPulse 0.4s ease-in-out;
  }

  @keyframes playIconPulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
  }

  .carousel-control {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    top: 45%; /* moved up from 50% */
  }

  .gradient-overlay {
    transition: opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .carousel-slide.active .gradient-overlay {
    animation: gradientPulse 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  @keyframes gradientPulse {
    0% {
      opacity: 0.8;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 1;
    }
  }

  .dots-container {
    position: absolute;
    left: 50%;
    bottom: 1rem; 
    transform: translateX(-50%);
    display: flex;
    z-index: 10;
    animation: dotsSlideUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.6s both;
  }

  /* Hide dots on mobile */
  @media (max-width: 639px) {
    .dots-container {
      display: none;
    }
  }

  @media (min-width: 640px) {
    .dots-container {
      bottom: 1rem; /* was 2rem */
      display: flex;
    }
  }
</style>