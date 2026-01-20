<script lang="ts">
  import Player from './Player.svelte';
  import IframePlayer from './iframe.svelte';
  export let videoSrc: string = '';
  export let poster: string = '';
  export let subtitles: Array<any> = [];
  export let useIframePlayer: boolean = false;
  export let goToEpisode: (id: string) => void;
  export let onRefreshSource: (videoUrl: string) => void = () => {};
  export let intro: { start: number; end: number } | null = null;
  export let autoSkipIntro: boolean = false;
  export let autoSkipOutro: boolean = false;
  export let outro: { start: number; end: number } | null = null;
  export let episodeId: string = '';
  export let category: string = 'sub';
  export let animeInfo: any;
  export let episodeNum: number;
  export let episodes: any[] = [];
  export let autoNext: boolean = false;
  export let apiIframeUrl: string | null = null;
  export let currentServer: string = 'hd-2';
  export let autoPlay: boolean = false;
  export let playNext: () => void = () => {};

  function setUseIframePlayer(v: boolean) { useIframePlayer = v; }

  // Helper to extract code after ep=
  function getIframeEpisodeCode(id: string) {
    const match = id.match(/ep=(\d+)/);
    return match ? match[1] : id;
  }

  // Wrapper for playNext that doesn't require parameters
  async function handlePlayNext() {
    await playNext();
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
      {autoPlay}
      {autoSkipIntro}
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
        {autoSkipOutro}
        {autoPlay}
        {autoNext}
        playNext={handlePlayNext}
      />
    {/key}
  {/if}
</div>