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
      if (animes?.length > 0 && !isTransitioning) nextSlide();
    }, intervalMs);
  }

  function prevSlide() {
    if (animes?.length > 0 && !isTransitioning) {
      isTransitioning = true;
      carouselIndex = (carouselIndex - 1 + animes.length) % animes.length;
      setTimeout(() => { isTransitioning = false; }, 800);
      resetInterval();
    }
  }
  
  function nextSlide() {
    if (animes?.length > 0 && !isTransitioning) {
      isTransitioning = true;
      carouselIndex = (carouselIndex + 1) % animes.length;
      setTimeout(() => { isTransitioning = false; }, 800);
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

<div class="relative w-full max-w-[1800px] mx-auto rounded-xl overflow-hidden shadow-2xl min-h-[220px] sm:min-h-[460px] flex items-center bg-[#0a0a0a] group/carousel">
  {#each animes as anime, i (anime.id)}
    <div class="carousel-slide {i === carouselIndex ? 'active' : i === (carouselIndex - 1 + animes.length) % animes.length ? 'prev' : i === (carouselIndex + 1) % animes.length ? 'next' : ''}">
      {#if Math.abs(i - carouselIndex) <= 1 || (i === 0 && carouselIndex === animes.length - 1) || (i === animes.length - 1 && carouselIndex === 0) || i === carouselIndex}
        <a href={`/hanime/info/${anime.id}`} class="block relative w-full h-[220px] sm:h-[460px]">
          <div class="absolute inset-0 w-full h-full image-container overflow-hidden">
            <img src={anime.poster} alt={anime.name} class="w-full h-full object-cover" style="object-position: center 20%;" draggable="false" />
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent"></div>
          </div>

          <div class="absolute left-0 bottom-0 w-full px-4 pt-4 pb-8 sm:p-10 z-20 content-container flex flex-col items-start gap-0.5 sm:gap-2">
            <div class="flex items-center gap-2 sm:gap-3 text-white text-xs sm:text-base font-medium anime-badges opacity-0 mt-6 sm:mt-0">
               <span class="flex items-center gap-1 bg-[#ff003c] text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-bold shadow">
                Rank #{anime.rank || 'N/A'}
              </span>
              <span class="flex items-center gap-1 bg-black/30 text-orange-300 px-2 sm:px-3 py-1 rounded text-xs episode-badge">
                HD
              </span>
            </div>

            <h2 class="text-white text-lg sm:text-3xl md:text-4xl font-bold truncate drop-shadow anime-title max-w-[90%] -mt-1 sm:mt-0">
              {anime.name}
            </h2>

            <p class="text-gray-300 text-xs sm:text-sm md:text-base drop-shadow anime-description">
              {anime.description}
            </p>

            <button
              class="absolute right-3 sm:right-10 bottom-3 sm:bottom-10 z-10 flex items-center gap-2 sm:gap-3 bg-[#ff003c] hover:bg-[#d90033] text-white font-bold px-4 py-2 sm:px-8 sm:py-4 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(255,0,60,0.3)] hover:shadow-[0_0_25px_rgba(255,0,60,0.6)] active:scale-95"
              on:click|preventDefault={() => onWatch(anime.id)}
            >
              <svg class="w-4 h-4 sm:w-6 sm:h-6 fill-current transition-transform duration-300" viewBox="0 0 20 20"><path d="M6 4l12 6-12 6V4z"/></svg>
              <span class="hidden sm:inline text-xs sm:text-lg font-bold tracking-widest">WATCH NOW</span>
            </button>
          </div>
        </a>
      {/if}
    </div>
  {/each}

  <button on:click|stopPropagation={prevSlide} class="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-orange-400 text-white hover:text-gray-900 rounded-full w-8 sm:w-14 h-8 sm:h-14 flex items-center justify-center shadow-lg transition z-10 border-2 border-white/10 hover:border-orange-400 carousel-control" aria-label="Previous Slide">
    <svg class="w-5 h-5 sm:w-8 sm:h-8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
  </button>
  <button on:click|stopPropagation={nextSlide} class="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-orange-400 text-white hover:text-gray-900 rounded-full w-8 sm:w-14 h-8 sm:h-14 flex items-center justify-center shadow-lg transition z-10 border-2 border-white/10 hover:border-orange-400 carousel-control" aria-label="Next Slide">
    <svg class="w-5 h-5 sm:w-8 sm:h-8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
  </button>

  <div class="absolute bottom-4 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-2 z-30">
    {#each animes as _, i}
      <button 
        on:click={() => { if(!isTransitioning) { isTransitioning = true; carouselIndex = i; setTimeout(() => isTransitioning = false, 800); resetInterval(); }}}
        class="h-1.5 rounded-full transition-all duration-500 {i === carouselIndex ? 'w-8 bg-[#ff003c] shadow-[0_0_10px_rgba(255,0,60,0.6)]' : 'w-1.5 bg-white/30 hover:bg-white/60'}"
        aria-label="Go to slide {i}"
      ></button>
    {/each}
  </div>
</div>

<style>
  .carousel-slide {
    position: absolute; width: 100%; height: 100%; top: 0; left: 0;
    opacity: 0; z-index: 0; pointer-events: none; transform: scale(1.05);
    transition: opacity 0.8s ease-out, transform 0.8s ease-out;
  }
  .carousel-slide.active { opacity: 1; z-index: 2; pointer-events: auto; transform: scale(1); }
  .carousel-slide.prev, .carousel-slide.next { opacity: 0; z-index: 1; }
  .carousel-slide.active .image-container img { animation: slowPan 10s linear forwards; }
  @keyframes slowPan { from { transform: scale(1.1); } to { transform: scale(1.0); } }
  
  /* Staggered Text Animation */
  .carousel-slide.active .anime-badges { animation: fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; }
  .carousel-slide.active .anime-title { opacity: 0; animation: fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; }
  .carousel-slide.active .anime-description { opacity: 0; animation: fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; }
  .carousel-slide.active button[on\:click] { opacity: 0; animation: fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards; }

  @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

  .carousel-control {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    top: 45% !important;
  }

  @media (max-width: 640px) {
    button[aria-label="Previous Slide"], button[aria-label="Next Slide"] {
      opacity: 1 !important; width: 2.5rem; height: 2.5rem; background: rgba(0,0,0,0.4);
    }
  }
</style>