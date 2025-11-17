<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  export let src: string = '';
  export let poster: string = '';
  export let subtitles: Array<{ url: string; label: string; lang?: string }> = [];

  let videoRef: HTMLVideoElement | null = null;
  let plyr: any = null;
  let hls: any = null;
  let Plyr: any = null;
  let Hls: any = null;
  let lastSrc = '';
  let lastSubs = '';

  // Convert hanime subtitle format to Plyr's
  $: plyrSubtitles = subtitles.map((sub, index) => ({
    src: sub.url,
    label: sub.label,
    srclang: sub.lang || 'en', // Default to 'en' if not specified
    default: index === 0 // Make first subtitle default
  }));

  async function loadLibraries() {
    if (!browser) return;
    try {
      const [PlyrModule, HlsModule] = await Promise.all([
        import('plyr'),
        import('hls.js')
      ]);
      Plyr = PlyrModule.default;
      Hls = HlsModule.default;
      // Load Plyr CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/plyr/3.7.8/plyr.css';
      document.head.appendChild(link);
    } catch (error) {
      console.error('Failed to load video player libraries:', error);
    }
  }

  function cleanup() {
    if (plyr) {
      try {
        plyr.destroy();
      } catch (e) {
        console.warn('Error destroying Plyr instance:', e);
      }
      plyr = null;
    }
    if (hls) {
      try {
        hls.destroy();
      } catch (e) {
        console.warn('Error destroying HLS instance:', e);
      }
      hls = null;
    }
  }

  // Function to detect subtitle format based on content
  function detectSubtitleFormat(content: string): 'srt' | 'vtt' | 'unknown' {
    // Check for VTT header
    if (content.trim().startsWith('WEBVTT')) {
      return 'vtt';
    }
    
    // Check for SRT format (numeric cue followed by timestamp)
    const srtPattern = /^\d+\s*\r?\n\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/m;
    if (srtPattern.test(content)) {
      return 'srt';
    }
    
    return 'unknown';
  }

  // Function to convert SRT timestamp to VTT format
  function convertSrtTimestamp(srtTime: string): string {
    // Convert "00:00:17,460" to "00:00:17.460"
    return srtTime.replace(',', '.');
  }

  // Function to convert SRT content to VTT format
  function convertSrtToVtt(srtContent: string): string {
    const lines = srtContent.trim().split(/\r?\n/);
    let vttContent = 'WEBVTT\n\n';
    
    let i = 0;
    while (i < lines.length) {
      // Skip empty lines
      if (!lines[i] || lines[i].trim() === '') {
        i++;
        continue;
      }
      
      // Skip sequence number (SRT format starts with number)
      if (/^\d+$/.test(lines[i].trim())) {
        i++;
        continue;
      }
      
      // Look for timestamp line
      const timestampMatch = lines[i].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      if (timestampMatch) {
        const startTime = convertSrtTimestamp(timestampMatch[1]);
        const endTime = convertSrtTimestamp(timestampMatch[2]);
        vttContent += `${startTime} --> ${endTime}\n`;
        i++;
        
        // Collect subtitle text until next sequence number or end
        const subtitleLines = [];
        while (i < lines.length && 
               lines[i].trim() !== '' && 
               !/^\d+$/.test(lines[i].trim()) &&
               !lines[i].match(/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/)) {
          subtitleLines.push(lines[i]);
          i++;
        }
        
        vttContent += subtitleLines.join('\n') + '\n\n';
      } else {
        i++;
      }
    }
    
    return vttContent;
  }

  async function fetchAndCreateSubtitleBlob(url: string): Promise<string> {
    try {
      const response = await fetch(`/api/hanime/subtitles?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error('Failed to fetch subtitle');
      
      const content = await response.text();
      const format = detectSubtitleFormat(content);
      
      let vttContent: string;
      
      switch (format) {
        case 'srt':
          console.log('Converting SRT to VTT format');
          vttContent = convertSrtToVtt(content);
          break;
        case 'vtt':
          console.log('Using VTT format as-is');
          vttContent = content;
          break;
        default:
          console.warn('Unknown subtitle format, attempting to use as VTT');
          // Try to use as VTT, prepend header if missing
          vttContent = content.trim().startsWith('WEBVTT') ? content : `WEBVTT\n\n${content}`;
          break;
      }
      
      const blob = new Blob([vttContent], { type: 'text/vtt' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('Failed to proxy subtitle:', error);
      return url; // Fallback to original URL
    }
  }

  async function addSubtitleTracks() {
    if (!videoRef || !browser) return;
    
    // Remove existing tracks
    const existingTracks = videoRef.querySelectorAll('track');
    existingTracks.forEach(track => track.remove());

    // Never set crossorigin - let subtitles fail rather than breaking video
    videoRef.removeAttribute('crossorigin');

    // Add new tracks with proxied URLs for external subtitles
    for (const [index, subtitle] of plyrSubtitles.entries()) {
      const track = document.createElement('track');
      track.kind = 'captions';
      track.srclang = subtitle.srclang;
      track.label = subtitle.label;
      track.default = subtitle.default;
      
      // Check if it's an external URL
      if (subtitle.src.startsWith('http') && !subtitle.src.startsWith(window.location.origin)) {
        // Try to proxy the subtitle and convert format if needed
        track.src = await fetchAndCreateSubtitleBlob(subtitle.src);
      } else {
        // For local files, we might still need format conversion
        try {
          const response = await fetch(subtitle.src);
          if (response.ok) {
            const content = await response.text();
            const format = detectSubtitleFormat(content);
            
            if (format === 'srt') {
              console.log('Converting local SRT file to VTT');
              const vttContent = convertSrtToVtt(content);
              const blob = new Blob([vttContent], { type: 'text/vtt' });
              track.src = URL.createObjectURL(blob);
            } else {
              track.src = subtitle.src;
            }
          } else {
            track.src = subtitle.src;
          }
        } catch (error) {
          console.warn('Failed to process local subtitle file:', error);
          track.src = subtitle.src;
        }
      }
      
      videoRef.appendChild(track);
    }
  }

  // --- Orientation helpers for mobile fullscreen ---
  function isMobileDevice() {
    if (!browser) return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.matchMedia('(max-width: 768px)').matches;
  }

  async function lockToLandscape() {
    if (!isMobileDevice() || !browser) return;
    try {
      if ((screen.orientation as any)?.lock) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch (e) {
      // fallback: do nothing
    }
  }

  async function unlockOrientation() {
    if (!isMobileDevice() || !browser) return;
    try {
      if (screen.orientation?.unlock) {
        screen.orientation.unlock();
      }
    } catch (e) {}
  }

  // Store handler references
  let enterFullscreenHandler: (() => void) | null = null;
  let exitFullscreenHandler: (() => void) | null = null;

  function setupOrientationHandling() {
    if (!plyr || !browser) return;

    // Remove previous listeners if any
    if (enterFullscreenHandler) {
      plyr.off('enterfullscreen', enterFullscreenHandler);
    }
    if (exitFullscreenHandler) {
      plyr.off('exitfullscreen', exitFullscreenHandler);
    }

    enterFullscreenHandler = async () => {
      if (!isMobileDevice()) return;
      if (screen.orientation?.lock) {
        try {
          await screen.orientation.lock('landscape');
        } catch {}
      }
    };

    exitFullscreenHandler = async () => {
      if (!isMobileDevice()) return;
      if (screen.orientation?.unlock) {
        try {
          screen.orientation.unlock();
        } catch {}
      }
    };

    plyr.on('enterfullscreen', enterFullscreenHandler);
    plyr.on('exitfullscreen', exitFullscreenHandler);
  }

  function createPlyrInstance() {
    if (!videoRef || plyr) return;

    plyr = new Plyr(videoRef, {
      controls: [
        'play-large', 'play', 'progress', 'current-time', 'mute', 'volume',
        'captions', 'settings', 'quality', 'fullscreen'
      ],
      captions: {
        active: false, // Start with captions off, let user enable
        language: 'auto',
        update: true
      },
      settings: ['captions', 'quality', 'speed'],
      tooltips: { controls: true, seek: true },
      keyboard: { focused: true, global: false }
    });

    // Wait for all tracks to load properly
    plyr.on('ready', () => {
      console.log('Plyr ready');

      // Attempt to play the video automatically
      plyr.play().catch(error => {
        // Autoplay can be blocked by browsers, log a warning if it happens.
        // User might need to interact with the page to start playback.
        console.warn('Autoplay prevented:', error);
      });

      // Wait for text tracks to be available
      setTimeout(() => {
        const textTracks = videoRef?.textTracks;
        console.log('Text tracks available:', textTracks?.length ?? 0);

        if (textTracks && textTracks.length > 0) {
          // Enable the first track
          for (let i = 0; i < textTracks.length; i++) {
            textTracks[i].mode = i === 0 ? 'showing' : 'disabled';
          }

          // Force Plyr to recognize the active track
          plyr.captions.active = true;
          console.log('First subtitle track activated');
        }
      }, 500);
    });

    // Orientation handling for mobile fullscreen
    setupOrientationHandling();

    // Additional events for debugging
    plyr.on('loadedmetadata', () => {
      console.log('Video metadata loaded');
    });

    plyr.on('captionsenabled', () => {
      console.log('Captions enabled by user');
    });

    plyr.on('captionsdisabled', () => {
      console.log('Captions disabled by user');
    });
  }

  async function initializePlayer() {
    if (!videoRef || !browser || !Plyr || !Hls) return;
    
    cleanup();
    
    // First add subtitle tracks
    await addSubtitleTracks();
    
    // Wait for tracks to be properly added
    await new Promise(resolve => setTimeout(resolve, 200));

    if (Hls.isSupported() && src.includes('.m3u8')) {
      hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        xhrSetup: function (xhr: any) {
          xhr.withCredentials = false;
        }
      });
      
      hls.loadSource(src);
      hls.attachMedia(videoRef);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Wait a bit more for HLS to settle
        setTimeout(() => {
          createPlyrInstance();
        }, 100);
      });

      hls.on(Hls.Events.ERROR, function (event: any, data: any) {
        console.error('HLS Error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error - trying to recover');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error - trying to recover');
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else {
      // Regular MP4 or other formats
      videoRef.src = src;
      
      const handleCanPlay = () => {
        createPlyrInstance();
        if (videoRef) {
          videoRef.removeEventListener('canplay', handleCanPlay);
        }
      };
      
      // Use canplay instead of loadedmetadata for better timing
      videoRef.addEventListener('canplay', handleCanPlay);
      
      // Fallback
      setTimeout(() => {
        if (!plyr) {
          console.log('Fallback: Creating Plyr instance');
          createPlyrInstance();
        }
      }, 1500);
    }
  }

  // Watch for changes in src or subtitles
  $: {
    if (browser && Plyr && Hls) {
      const subsString = JSON.stringify(plyrSubtitles);
      if (
        videoRef &&
        (src !== lastSrc || subsString !== lastSubs) &&
        src // Only initialize if we have a source
      ) {
        lastSrc = src;
        lastSubs = subsString;
        initializePlayer();
      }
    }
  }

  onMount(async () => {
    if (browser) {
      await loadLibraries();
      if (videoRef && src && Plyr && Hls) {
        await initializePlayer();
      }
    }
  });

  onDestroy(() => {
    cleanup();
    // Also unlock orientation on destroy
    if (browser) {
      unlockOrientation();
    }
  });
</script>

<div class="player-container">
  <video
    bind:this={videoRef}
    controls
    playsinline
    autoplay
    muted
    {poster}
    class="responsive-video"
    preload="metadata"
  >
    <!-- Subtitle tracks are added dynamically in JavaScript -->
    <track kind="captions" label="No captions available" srclang="en" default>
    Your browser does not support the video tag.
  </video>
</div>

<style>
  .player-container {
    position: relative;
    width: 100%;
    max-width: 100%;
    aspect-ratio: 16 / 9;
    background: black;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center; 
    min-height: 120px;
    box-sizing: border-box;
    border-radius: 0.25rem; /* Reduced from 0.75rem to 0.25rem */
  }

  .responsive-video {
    width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
    object-fit: contain !important; /* Changed from 'cover' to 'contain' to prevent zooming */
    background: black;
    display: block;
    box-sizing: border-box;
    border-radius: 0.25rem;
  }

  /* Reddish accent for Plyr */
  :global(.plyr) {
    --plyr-color-main: #ff003c; /* reddish accent */
    --plyr-control-color: #fff;
    --plyr-control-hover-background: #ff003c;
    --plyr-tooltip-background: #2a0008;
    --plyr-tooltip-color: #fff;
    --plyr-menu-background: #2a0008;
    --plyr-menu-color: #fff;
    background: transparent !important;
    color: #fff !important;
    border-radius: 0.25rem; /* Reduced from 0.75rem to 0.25rem */
  }

  :global(.plyr__control) {
    color: #fff !important;
    background: transparent !important;
    border-radius: 0.25rem !important; /* Reduced from 0.5rem to 0.25rem */
    transition: background 0.2s, color 0.2s;
  }

  :global(.plyr__control[aria-pressed="true"]),
  :global(.plyr__control:hover),
  :global(.plyr__control:focus) {
    background: unset !important;
    color: #ff003c !important;
  }

  :global(.plyr__control[aria-expanded="true"]) {
    background: #ff003c !important;
    color: #fff !important;
  }

  :global(.plyr__control[aria-expanded="false"]) {
    background: unset !important;
    color: #fff !important;
  }

  :global(.plyr__progress input[type="range"]) {
    color: #ff003c !important;
  }

  :global(.plyr__menu__container) {
    background: #2a0008 !important;
    color: #fff !important;
    border-radius: 0.25rem; /* Reduced from 0.5rem to 0.25rem */
  }

  :global(.plyr__menu__container .plyr__control[role="menuitemradio"][aria-checked="true"]) {
    color: #ff003c !important;
  }

  :global(.plyr__tooltip) {
    background: #2a0008 !important;
    color: #fff !important;
  }

  :global(.plyr__captions) {
    font-size: 1.1em !important;
    color: #fff !important;
    text-shadow: 0 2px 4px #000, 0 0 2px #000 !important;
    background: none !important;
    padding: 0.2em 0.6em !important;
    border-radius: 0.15rem !important; /* Reduced from 0.3em to 0.15rem */
    line-height: 1.4 !important;
    bottom: 3% !important;
    position: absolute !important;
    width: 100%;
    left: 0;
    right: 0;
    text-align: center;
  }

  @media (max-width: 768px) {
    :global(.plyr__captions) {
      font-size: 12px !important;
    }
    :global(.plyr__controls .plyr__volume input[type="range"]) {
      display: none !important;
    }
    :global(.plyr__controls .plyr__volume) {
      min-width: 0 !important;
      width: auto !important;
    }
  }

  /* Hide subtitle button except fullscreen */
  :global(.plyr__controls .plyr__control[data-plyr="captions"]) {
    display: none !important;
  }
  :global(.plyr--fullscreen-active .plyr__controls .plyr__control[data-plyr="captions"]) {
    display: inline-flex !important;
  }

  /* Always keep the fullscreen icon white */
  :global(.plyr__control[data-plyr="fullscreen"]),
  :global(.plyr__control[data-plyr="fullscreen"]:hover),
  :global(.plyr__control[data-plyr="fullscreen"]:focus),
  :global(.plyr__control[data-plyr="fullscreen"][aria-pressed="true"]) {
    color: #fff !important;
    background: unset !important;
  }

  /* Play, pause, and captions (CC/sub) icons: always white */
  :global(.plyr__control[data-plyr="play"] svg),
  :global(.plyr__control[data-plyr="pause"] svg),
  :global(.plyr__control[data-plyr="captions"] svg) {
    fill: #fff !important;
    color: #fff !important;
  }

  :global(.plyr__control--overlaid) {
    background: #ff003c !important;    /* Reddish background */
    color: #fff !important;
    border-radius: 50% !important;
    box-shadow: 0 2px 8px #0005;
    opacity: 0.95;
    transition: background 0.2s, color 0.2s;
  }
  :global(.plyr__control--overlaid:hover),
  :global(.plyr__control--overlaid:focus) {
    background: #c2002f !important;    /* Slightly darker on hover */
    color: #fff !important;
  }
</style>