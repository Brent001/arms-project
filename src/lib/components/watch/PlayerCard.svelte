<script lang="ts">
  import Player from './Player.svelte';
  import IframePlayer from './iframe.svelte';
  export let videoSrc: string = '';
  export let poster: string = '';
  export let subtitles: Array<any> = [];
  export let useArtPlayer: boolean = true;
  export let useIframePlayer: boolean = false;
  export let goToEpisode: (id: string) => void;
  export let onRefreshSource: (videoUrl: string) => void = () => {};
  export let intro: { start: number; end: number } | null = null;
  export let outro: { start: number; end: number } | null = null;
  export let autoSkipIntro: boolean = false;
  export let episodeId: string = '';
  export let category: string = 'sub';
  export let animeInfo: any;
  export let episodeNum: number;
  export let episodes: any[] = [];
  export let autoNext: boolean = false;
  export let apiIframeUrl: string | null = null;
  export let currentServer: string = 'hd-2';

  function setUseIframePlayer(v: boolean) { useIframePlayer = v; }

  // Helper to extract code after ep=
  function getIframeEpisodeCode(id: string) {
    const match = id.match(/ep=(\d+)/);
    return match ? match[1] : id;
  }
</script>

<div class="w-full aspect-video rounded-md overflow-hidden shadow-lg bg-black flex items-center justify-center">
  {#if useIframePlayer}
    <IframePlayer
      episodeId={getIframeEpisodeCode(episodeId)}
      category={category}
      {animeInfo}
      {episodeNum}
      {episodes}
      playNext={goToEpisode}
      autoNext={autoNext}
      {apiIframeUrl}
      {currentServer}
    />
  {:else}
    {#key videoSrc}
      <Player 
        videoUrl={videoSrc}
        poster={poster}
        subtitles={subtitles}
        onRefreshSource={onRefreshSource}
        {intro}
        {outro}
        {autoSkipIntro}
      />
    {/key}
  {/if}
</div>