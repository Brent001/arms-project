<script lang="ts">
  import AnimeCard from '$lib/components/QtipCard.svelte';
  import '@fortawesome/fontawesome-free/css/all.css';
  
  export let data: any;
</script>

<section class="max-w-[1800px] mx-auto px-2 mt-8">
  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1">
    <!-- Top Airing -->
    <div>
      <div class="text-xl font-bold text-orange-300 mb-4 text-left md:text-left block w-fit">
        Top Airing
      </div>
      <div class="flex flex-col gap-4 bg-gray-800 rounded-xl p-4">
        {#each data.topAiringAnimes?.slice(0, 5) as anime}
          <a href={`/info/${anime.id}`} class="flex items-center gap-3 border-b border-gray-700 pb-3 last:border-b-0 last:pb-0 hover:bg-gray-700 transition rounded">
            <img src={anime.poster} alt={anime.name} class="w-12 h-16 rounded-md object-cover" />
            <div class="flex-1">
              <div class="font-semibold text-white text-[14px] leading-tight line-clamp-2">{anime.name}</div>
              <div class="flex items-center gap-2 mt-1">
                {#if anime.episodes?.sub}
                  <span class="flex items-center bg-green-200 text-black text-xs font-bold px-2 py-0.5 rounded">
                    <i class="fas fa-closed-captioning text-[16px] mr-1"></i>
                    {anime.episodes.sub}
                  </span>
                {/if}
                {#if anime.episodes?.dub}
                  <span class="flex items-center bg-blue-200 text-black text-xs font-bold px-2 py-0.5 rounded">
                    <i class="fas fa-microphone text-[16px] mr-1"></i>
                    {anime.episodes.dub}
                  </span>
                {/if}
                <span class="text-xs text-gray-300">{anime.type}</span>
              </div>
            </div>
          </a>
        {/each}
        <a href="/top-airing" class="block text-left text-orange-300 hover:text-orange-400 font-semibold mt-2 transition">View more &gt;</a>
      </div>
    </div>

    <!-- Most Popular -->
    <div>
      <div class="text-xl font-bold text-orange-300 mb-4 text-left md:text-left block w-fit">
        Most Popular
      </div>
      <div class="flex flex-col gap-4 bg-gray-800 rounded-xl p-4">
        {#each data.mostPopularAnimes?.slice(0, 5) as anime}
          <a href={`/info/${anime.id}`} class="flex items-center gap-3 border-b border-gray-700 pb-3 last:border-b-0 last:pb-0 hover:bg-gray-700 transition rounded">
            <img src={anime.poster} alt={anime.name} class="w-12 h-16 rounded-md object-cover" />
            <div class="flex-1">
              <div class="font-semibold text-white text-[14px] leading-tight line-clamp-2">{anime.name}</div>
              <div class="flex items-center gap-2 mt-1">
                {#if anime.episodes?.sub}
                  <span class="flex items-center bg-green-200 text-black text-xs font-bold px-2 py-0.5 rounded">
                    <i class="fas fa-closed-captioning text-[16px] mr-1"></i>
                    {anime.episodes.sub}
                  </span>
                {/if}
                {#if anime.episodes?.dub}
                  <span class="flex items-center bg-blue-200 text-black text-xs font-bold px-2 py-0.5 rounded">
                    <i class="fas fa-microphone text-[16px] mr-1"></i>
                    {anime.episodes.dub}
                  </span>
                {/if}
                <span class="text-xs text-gray-300">{anime.type}</span>
              </div>
            </div>
            
          </a>
        {/each}
        <a href="/category/most-popular" class="block text-left text-orange-300 hover:text-orange-400 font-semibold mt-2 transition">View more &gt;</a>
      </div>
    </div>

    <!-- Most Favorite -->
    <div>
      <div class="text-xl font-bold text-orange-300 mb-4 text-left md:text-left block w-fit">
        Most Favorite
      </div>
      <div class="flex flex-col gap-4 bg-gray-800 rounded-xl p-4">
        {#each data.mostFavoriteAnimes?.slice(0, 5) as anime}
          <a href={`/info/${anime.id}`} class="flex items-center gap-3 border-b border-gray-700 pb-3 last:border-b-0 last:pb-0 hover:bg-gray-700 transition rounded">
            <img src={anime.poster} alt={anime.name} class="w-12 h-16 rounded-md object-cover" />
            <div class="flex-1">
              <div class="font-semibold text-white text-[14px] leading-tight line-clamp-2">{anime.name}</div>
              <div class="flex items-center gap-2 mt-1">
                {#if anime.episodes?.sub}
                  <span class="flex items-center bg-green-200 text-black text-xs font-bold px-2 py-0.5 rounded">
                    <i class="fas fa-closed-captioning text-[16px] mr-1"></i>
                    {anime.episodes.sub}
                  </span>
                {/if}
                {#if anime.episodes?.dub}
                  <span class="flex items-center bg-blue-200 text-black text-xs font-bold px-2 py-0.5 rounded">
                    <i class="fas fa-microphone text-[16px] mr-1"></i>
                    {anime.episodes.dub}
                  </span>
                {/if}
                <span class="text-xs text-gray-300">{anime.type}</span>
              </div>
            </div>
          </a>
        {/each}
        <a href="/most-favorite" class="block text-left text-orange-300 hover:text-orange-400 font-semibold mt-2 transition">View more &gt;</a>
      </div>
    </div>

    <!-- Latest Completed -->
    <div>
      <div class="text-xl font-bold text-orange-300 mb-4 text-left md:text-left block w-fit">
        Latest Completed
      </div>
      <div class="flex flex-col gap-4 bg-gray-800 rounded-xl p-4">
        {#each data.latestCompletedAnimes?.slice(0, 5) as anime}
          <a href={`/info/${anime.id}`} class="flex items-center gap-3 border-b border-gray-700 pb-3 last:border-b-0 last:pb-0 hover:bg-gray-700 transition rounded">
            <img src={anime.poster} alt={anime.name} class="w-12 h-16 rounded-md object-cover" />
            <div class="flex-1">
              <div class="font-semibold text-white text-[14px] leading-tight line-clamp-2">{anime.name}</div>
              <div class="flex items-center gap-2 mt-1">
                {#if anime.episodes?.sub}
                  <span class="flex items-center bg-green-200 text-black text-xs font-bold px-2 py-0.5 rounded">
                    <i class="fas fa-closed-captioning text-[16px] mr-1"></i>
                    {anime.episodes.sub}
                  </span>
                {/if}
                {#if anime.episodes?.dub}
                  <span class="flex items-center bg-blue-200 text-black text-xs font-bold px-2 py-0.5 rounded">
                    <i class="fas fa-microphone text-[16px] mr-1"></i>
                    {anime.episodes.dub}
                  </span>
                {/if}
                <span class="text-xs text-gray-300">{anime.type}</span>
              </div>
            </div>
          </a>
        {/each}
        <a href="/recently-completed" class="block text-left text-orange-300 hover:text-orange-400 font-semibold mt-2 transition">View more &gt;</a>
      </div>
    </div>
  </div>
</section>