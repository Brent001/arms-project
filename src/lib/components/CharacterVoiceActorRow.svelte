<script lang="ts">
  export let groupedCharacters: any[] = [];

  function safeSlice<T>(arr: T[] | undefined | null, start: number = 0, end?: number): T[] {
    if (!Array.isArray(arr)) return [];
    try {
      return arr.slice(start, end);
    } catch {
      return [];
    }
  }
</script>

<div class="w-full grid grid-cols-3 max-[1024px]:grid-cols-2 max-[758px]:grid-cols-1 gap-3">
  {#each safeSlice(groupedCharacters, 0, 6) as gc}
    <div class="flex justify-between items-center px-3 py-3 rounded-md bg-gray-800 gap-3 overflow-hidden">
      
      {#if gc.character}
        <div class="flex items-center gap-2 min-w-0 flex-1 text-left">
          {#if gc.character.poster}
            <img
              src={gc.character.poster}
              alt={gc.character.name || "Character"}
              on:error={(e) => { (e.target as HTMLImageElement).src = "https://i.postimg.cc/HnHKvHpz/no-avatar.jpg"; }}
              class="w-[45px] h-[45px] flex-shrink-0 rounded-full object-cover"
              loading="lazy"
            />
          {/if}
          <div class="flex flex-col justify-center min-w-0">
            {#if gc.character.name}
              <h4 class="text-[13px] font-bold text-gray-100 truncate leading-tight">
                {gc.character.name}
              </h4>
            {/if}
            {#if gc.character.cast}
              <p class="text-[11px] text-blue-300 truncate mt-0.5">
                {gc.character.cast}
              </p>
            {/if}
          </div>
        </div>
      {/if}

      {#if gc.voiceActors.length > 0 && gc.voiceActors[0]}
        {@const va = gc.voiceActors[0]}
        <div class="flex items-center gap-2 min-w-0 flex-1 justify-end text-right">
          <div class="flex flex-col justify-center min-w-0 items-end">
            {#if va.name}
              <h4 class="text-[13px] font-medium text-gray-200 truncate leading-tight">
                {va.name}
              </h4>
            {/if}
            <p class="text-[11px] text-gray-500 truncate mt-0.5">
               {va.language || 'Voice Actor'}
            </p>
          </div>
          {#if va.poster}
            <img
              src={va.poster}
              alt={va.name || "Voice Actor"}
              on:error={(e) => { (e.target as HTMLImageElement).src = "https://i.postimg.cc/HnHKvHpz/no-avatar.jpg"; }}
              class="w-[45px] h-[45px] flex-shrink-0 rounded-full object-cover"
              loading="lazy"
            />
          {/if}
        </div>
      {/if}
    </div>
  {/each}
</div>