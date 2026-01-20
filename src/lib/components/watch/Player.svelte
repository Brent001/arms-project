<script lang="ts">
/// <reference path="../../lib/types/screen-orientation.d.ts" />
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  
  export let videoUrl: string = '';
  export let videoType: string = 'application/x-mpegURL';
  export let subtitles: Array<{
    src: string;
    label: string;
    srclang?: string;
  }> = [];
  export let poster: string = '';
  export let thumbnailsVtt: string = '';
  export let onRefreshSource: (videoUrl: string) => void = () => {};

  export let intro: { start: number; end: number } | null = null;
  export let outro: { start: number; end: number } | null = null;
  export let autoSkipIntro: boolean = false;
  export let autoSkipOutro: boolean = false;
  export let autoPlay: boolean = false;
  export let autoNext: boolean = false;
  export let playNext: () => void = () => {};

  let videoRef: HTMLVideoElement | null = null;
  let plyr: any = null;
  let hls: any = null;
  let lastVideoUrl = '';
  let lastSubtitles: string = '';
  let selectedLanguage = 'auto';
  let loading = false;
  let buffering = false;

  // Store event handler references to properly remove them
  let bufferingHandlers: {
    onWaiting?: () => void;
    onPlaying?: () => void;
    onCanPlay?: () => void;
    onSeeking?: () => void;
    onSeeked?: () => void;
    onEnded?: () => void;
    onPause?: () => void;
  } = {};

  // Dynamically import libraries only in browser
  let Plyr: any = null;
  let Hls: any = null;

  async function loadLibraries() {
    if (!browser) return;
    
    try {
      // Dynamic imports to avoid SSR issues
      const [PlyrModule, HlsModule] = await Promise.all([
        import('plyr'),
        import('hls.js')
      ]);
      
      Plyr = PlyrModule.default;
      Hls = HlsModule.default;
      
      // Import CSS dynamically
      await import('plyr/dist/plyr.css');
    } catch (error) {
      console.error('Failed to load video player libraries:', error);
    }
  }

  function cleanup() {
    detachBufferingEvents();
    detachVideoEndedHandler();
    stopDurationMonitor();
    
    // Destroy player instances
    if (plyr) {
      plyr.destroy();
      plyr = null;
    }
    if (hls) {
      hls.destroy();
      hls = null;
    }
  }

  // Dynamic language code detection and mapping
  function getLanguageCode(lang: string): string {
    if (!lang) return 'en';
    if (/^[a-z]{2}(-[A-Z]{2})?(-[a-z0-9]+)?$/i.test(lang)) {
      return lang.toLowerCase();
    }
    const langMap: { [key: string]: string } = {
      'english': 'en',
      'spanish': 'es',
      'french': 'fr',
      'german': 'de',
      'italian': 'it',
      'portuguese': 'pt',
      'russian': 'ru',
      'arabic': 'ar',
      'japanese': 'ja',
      'korean': 'ko',
      'chinese': 'zh',
      'dutch': 'nl',
      'turkish': 'tr',
      'hindi': 'hi',
      'bengali': 'bn',
      'urdu': 'ur',
      'thai': 'th',
      'vietnamese': 'vi',
      'polish': 'pl',
      'czech': 'cs',
      'hungarian': 'hu',
      'finnish': 'fi',
      'swedish': 'sv',
      'norwegian': 'no',
      'danish': 'da',
      'greek': 'el',
      'hebrew': 'he',
      'indonesian': 'id',
      'malay': 'ms',
      'filipino': 'tl',
      'tagalog': 'tl',
      'brazilian': 'pt-BR',
      'brazil': 'pt-BR',
      'latin': 'es-419',
      'mexico': 'es-MX',
      'canadian': 'en-CA',
      'british': 'en-GB',
      'american': 'en-US',
      'simplified': 'zh-CN',
      'traditional': 'zh-TW',
      'mandarin': 'zh',
      'cantonese': 'zh-HK'
    };
    const normalized = lang.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (langMap[normalized]) return langMap[normalized];
    for (const [key, code] of Object.entries(langMap)) {
      if (normalized.includes(key) || key.includes(normalized)) return code;
    }
    const firstWord = normalized.split(' ')[0];
    if (langMap[firstWord]) return langMap[firstWord];
    if (firstWord.length >= 2) {
      const potential = firstWord.slice(0, 2);
      const validCodes = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'ja', 'ko', 'zh', 'hi', 'th', 'vi'];
      if (validCodes.includes(potential)) return potential;
    }
    return 'en';
  }

  function processSubtitleUrl(url: string): string {
    if (!url) return url;
    // Proxy .vtt files to add Referer
    if (url.endsWith('.vtt')) {
      return `/api/proxy/vtt?url=${encodeURIComponent(url)}`;
    }
    return url;
  }

  function addSubtitleTracks() {
    if (!videoRef || !browser) return;
    // Remove existing tracks
    const existingTracks = videoRef.querySelectorAll('track');
    existingTracks.forEach(track => track.remove());

    // Enhanced logic for handling duplicate English subtitles
    const englishSubs = subtitles.filter(
      (subtitle) => getLanguageCode(subtitle.label) === 'en'
    );

    // Track counter for duplicate language codes
    const languageCounters: { [key: string]: number } = {};
    
    subtitles.forEach((subtitle, index) => {
      const track = document.createElement('track');
      track.kind = 'captions';
      track.src = processSubtitleUrl(subtitle.src);
      
      const langCode = getLanguageCode(subtitle.label);
      
      // Handle duplicate language codes by appending a counter
      if (languageCounters[langCode]) {
        languageCounters[langCode]++;
        track.srclang = `${langCode}-${languageCounters[langCode]}`;
      } else {
        languageCounters[langCode] = 1;
        track.srclang = langCode;
      }
      
      // Use the original label to preserve distinction between duplicates
      track.label = subtitle.label;

      // Enhanced default selection logic
      // Set the first English subtitle as default if multiple exist
      // Or set as default if it's the only English subtitle
      if (langCode === 'en') {
        if (englishSubs.length === 1) {
          // Single English subtitle - set as default
          track.default = true;
        } else if (englishSubs.length > 1 && index === subtitles.findIndex(s => getLanguageCode(s.label) === 'en')) {
          // Multiple English subtitles - set the first one as default
          track.default = true;
        } else {
          track.default = false;
        }
      } else {
        track.default = false;
      }

      if (videoRef) {
        videoRef.appendChild(track);
      }
    });

    // Log subtitle tracks for debugging
    console.log('Added subtitle tracks:', subtitles.map((sub, i) => ({
      index: i,
      label: sub.label,
      langCode: getLanguageCode(sub.label),
      src: sub.src
    })));
  }

  async function initializePlayer() {
    if (!videoRef || !browser || !Plyr || !Hls) return;
    
    cleanup();
    addSubtitleTracks();
    
    // Reset buffering state
    buffering = false;

    if (Hls.isSupported() && videoType === 'application/x-mpegURL') {
      console.log('Initializing HLS player with URL:', videoUrl);
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90
      });
      hls.loadSource(videoUrl);
      hls.attachMedia(videoRef);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed');
        if (!videoRef) return;

        // Get available quality levels (resolutions)
        const availableQualities = hls
          ? hls.levels
              .map((l: any) => l.height)
              .filter((v: any, i: number, a: any[]) => a.indexOf(v) === i)
              .sort((a: number, b: number) => b - a)
          : [];

        plyr = new Plyr(videoRef, {
          controls: [
            'play-large', 'play', 'progress', 'current-time', 'mute', 'volume',
            'captions', 'settings', 'quality', 'fullscreen'
          ],
          captions: { 
            active: false, 
            language: 'auto',
            update: true 
          },
          settings: ['captions', 'quality', 'speed'],
          quality: {
            default: availableQualities[0],
            options: availableQualities,
            forced: true,
            onChange: (newQuality: number) => {
              if (hls) {
                const levelIndex = hls.levels.findIndex((l: any) => l.height === newQuality);
                hls.currentLevel = levelIndex;
              }
            }
          }
        });

        // Sync Plyr UI with hls.js when user changes quality from Plyr menu
        plyr.on('qualitychange', (event: any) => {
          if (hls) {
            const newQuality = event.detail.plyr.quality;
            const levelIndex = hls.levels.findIndex((l: any) => l.height === newQuality);
            hls.currentLevel = levelIndex;
          }
        });

        setupOrientationHandling();
        setupCaptionEvents();
        attachBufferingEvents();
      });

      hls.on(Hls.Events.ERROR, function (event: any, data: any) {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error - attempting recovery');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error - attempting recovery');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error - refreshing source');
              onRefreshSource(videoUrl);
              break;
          }
        }
      });
    } else {
      console.log('Using fallback video player for URL:', videoUrl);
      if (!videoRef) return;
      videoRef.src = videoUrl;
      videoRef.addEventListener('loadedmetadata', () => {
        console.log('Video metadata loaded');
        if (!videoRef) return;
        plyr = new Plyr(videoRef, {
          controls: [
            'play-large', 'play', 'progress', 'current-time', 'mute', 'volume',
            'captions', 'settings', 'fullscreen'
          ],
          captions: { 
            active: false, 
            language: 'auto',
            update: true 
          },
          settings: ['captions', 'speed']
        });
        setupOrientationHandling();
        setupCaptionEvents();
        attachBufferingEvents();
      }, { once: true });
    }
  }

  // Extracted caption event setup for reusability
  function setupCaptionEvents() {
    if (!plyr || !browser) return;
    
    plyr.on('languagechange', () => {
      if (!plyr || !videoRef) return;
      if (plyr.currentTrack !== -1 && videoRef.textTracks[plyr.currentTrack]) {
        const currentTrack = videoRef.textTracks[plyr.currentTrack];
        selectedLanguage = currentTrack.language;
        console.log('Selected caption track:', {
          index: plyr.currentTrack,
          language: currentTrack.language,
          label: currentTrack.label
        });
        for (let i = 0; i < videoRef.textTracks.length; i++) {
          videoRef.textTracks[i].mode = i === plyr.currentTrack ? 'showing' : 'disabled';
        }
      } else {
        selectedLanguage = 'auto';
        for (let i = 0; i < videoRef.textTracks.length; i++) {
          videoRef.textTracks[i].mode = 'disabled';
        }
      }
    });
    
    plyr.on('captionsenabled', () => {
      console.log('Captions enabled');
    });
    
    plyr.on('captionsdisabled', () => {
      selectedLanguage = 'auto';
      console.log('Captions disabled');
    });
  }

  // Add event listeners for buffering/loading - FIXED VERSION
  function attachBufferingEvents() {
    if (!videoRef || !browser) return;
    
    // First, detach any existing handlers
    detachBufferingEvents();
    
    // Create new handler functions
    bufferingHandlers.onWaiting = () => { 
      if (videoType !== 'application/x-mpegURL') {
        console.log('Buffering started (waiting)');
        buffering = true;
      }
    };
    
    bufferingHandlers.onPlaying = () => { 
      console.log('Playing - clearing buffering');
      buffering = false;
    };
    
    bufferingHandlers.onCanPlay = () => { 
      console.log('Can play - clearing buffering');
      buffering = false;
    };
    
    bufferingHandlers.onSeeking = () => { 
      if (videoType !== 'application/x-mpegURL') {
        console.log('Seeking - buffering');
        buffering = true;
      }
    };
    
    bufferingHandlers.onSeeked = () => { 
      console.log('Seeked - clearing buffering');
      buffering = false;
    };
    
    bufferingHandlers.onEnded = () => {
      buffering = false;
      // Video end event is now handled by handleVideoEnded()
    };
    
    bufferingHandlers.onPause = () => { 
      console.log('Paused - clearing buffering');
      buffering = false;
    };
    
    // Attach the handlers
    videoRef.addEventListener('waiting', bufferingHandlers.onWaiting);
    videoRef.addEventListener('playing', bufferingHandlers.onPlaying);
    videoRef.addEventListener('canplay', bufferingHandlers.onCanPlay);
    videoRef.addEventListener('seeking', bufferingHandlers.onSeeking);
    videoRef.addEventListener('seeked', bufferingHandlers.onSeeked);
    videoRef.addEventListener('ended', bufferingHandlers.onEnded);
    videoRef.addEventListener('pause', bufferingHandlers.onPause);
    
    // Plyr events - disable buffering display for HLS
    if (plyr) {
      plyr.on('waiting', () => { 
        if (videoType !== 'application/x-mpegURL') {
          console.log('Plyr waiting - buffering');
          buffering = true;
        }
      });
      plyr.on('playing', () => { 
        console.log('Plyr playing - clearing buffering');
        buffering = false;
      });
      plyr.on('ended', () => {
        buffering = false;
        // Video end event is now handled by handleVideoEnded()
      });
    }
  }

  function detachBufferingEvents() {
    if (!videoRef || !browser) return;
    
    // Remove all event listeners using the stored references
    if (bufferingHandlers.onWaiting) {
      videoRef.removeEventListener('waiting', bufferingHandlers.onWaiting);
    }
    if (bufferingHandlers.onPlaying) {
      videoRef.removeEventListener('playing', bufferingHandlers.onPlaying);
    }
    if (bufferingHandlers.onCanPlay) {
      videoRef.removeEventListener('canplay', bufferingHandlers.onCanPlay);
    }
    if (bufferingHandlers.onSeeking) {
      videoRef.removeEventListener('seeking', bufferingHandlers.onSeeking);
    }
    if (bufferingHandlers.onSeeked) {
      videoRef.removeEventListener('seeked', bufferingHandlers.onSeeked);
    }
    if (bufferingHandlers.onEnded) {
      videoRef.removeEventListener('ended', bufferingHandlers.onEnded);
    }
    if (bufferingHandlers.onPause) {
      videoRef.removeEventListener('pause', bufferingHandlers.onPause);
    }
    
    // Clear the handlers object
    bufferingHandlers = {};
  }

  $: {
    if (browser && Plyr && Hls) {
      const subsString = JSON.stringify(subtitles);
      if (
        videoRef &&
        (videoUrl !== lastVideoUrl || subsString !== lastSubtitles)
      ) {
        lastVideoUrl = videoUrl;
        lastSubtitles = subsString;
        initializePlayer();
      }
    }
  }

  onMount(async () => {
    if (browser) {
      await loadLibraries();
      if (videoRef && videoUrl && Plyr && Hls) {
        await initializePlayer();
      }
    }
  });

  onDestroy(() => {
    if (browser) {
      unlockOrientation();
      cleanup();
    }
  });

  function isMobileDevice() {
    if (!browser) return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.matchMedia('(max-width: 768px)').matches;
  }

  async function lockToLandscape() {
    if (!isMobileDevice() || !browser) return;
    try {
      // Prefer the modern API
      if ((screen.orientation as any)?.lock) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch (e) {
      // fallback: try to rotate using deprecated APIs or do nothing
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
  let videoEndedHandler: ((event?: any) => Promise<void>) | null = null;
  let durationCheckInterval: NodeJS.Timeout | null = null;

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
      // Standard API
      if ((screen.orientation as any)?.lock) {
        try {
          await (screen.orientation as any).lock('landscape');
        } catch {}
      } else if ((screen as any).lockOrientation) {
        (screen as any).lockOrientation('landscape');
      } else if ((screen as any).mozLockOrientation) {
        (screen as any).mozLockOrientation('landscape');
      } else if ((screen as any).msLockOrientation) {
        (screen as any).msLockOrientation('landscape');
      }
    };

    exitFullscreenHandler = async () => {
      if (!isMobileDevice()) return;
      // Standard API
      if (screen.orientation?.unlock) {
        try {
          screen.orientation.unlock();
        } catch {}
      } else if ((screen as any).unlockOrientation) {
        (screen as any).unlockOrientation();
      } else if ((screen as any).mozUnlockOrientation) {
        (screen as any).mozUnlockOrientation();
      } else if ((screen as any).msUnlockOrientation) {
        (screen as any).msUnlockOrientation();
      }
    };

    plyr.on('enterfullscreen', enterFullscreenHandler);
    plyr.on('exitfullscreen', exitFullscreenHandler);
  }

  function updateTimelineMarkers() {
    if (!videoRef || !plyr || !browser) return;
    
    const progressBar = document.querySelector('.plyr__progress') as HTMLElement;
    if (!progressBar) return;
    
    const duration = videoRef.duration;
    if (!duration || duration === 0) return;
    
    // Remove existing markers
    const existingMarkers = progressBar.querySelectorAll('[data-timeline-marker]');
    existingMarkers.forEach(m => m.remove());
    
    // Add intro marker (purple)
    if (intro && intro.start < intro.end) {
      const startPercent = (intro.start / duration) * 100;
      const endPercent = (intro.end / duration) * 100;
      const introMarker = document.createElement('div');
      introMarker.setAttribute('data-timeline-marker', 'intro');
      introMarker.style.cssText = `
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        left: ${startPercent}%;
        width: ${endPercent - startPercent}%;
        height: 5px;
        background: #a855f7;
        opacity: 0.9;
        pointer-events: none;
        border-radius: 2px;
        box-shadow: 0 0 6px #a855f7;
      `;
      progressBar.appendChild(introMarker);
    }
    
    // Add outro marker (blue)
    if (outro && outro.start < outro.end) {
      const startPercent = (outro.start / duration) * 100;
      const endPercent = (outro.end / duration) * 100;
      const outroMarker = document.createElement('div');
      outroMarker.setAttribute('data-timeline-marker', 'outro');
      outroMarker.style.cssText = `
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        left: ${startPercent}%;
        width: ${endPercent - startPercent}%;
        height: 5px;
        background: #3b82f6;
        opacity: 0.9;
        pointer-events: none;
        border-radius: 2px;
        box-shadow: 0 0 6px #3b82f6;
      `;
      progressBar.appendChild(outroMarker);
    }
  }

  function initializePlyr() {
    if (!videoRef || plyr || !browser || !Plyr) return;

    addSubtitleTracks();

    plyr = new Plyr(videoRef, {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'mute',
        'volume',
        'captions',
        'settings',
        'fullscreen',
      ],
      captions: {
        active: true,
        language: 'auto',
        update: true
      }
    });

    // Attach orientation handling after Plyr is ready
    setupOrientationHandling();
    
    // Update timeline markers when metadata is loaded
    if (videoRef) {
      videoRef.addEventListener('loadedmetadata', () => {
        setTimeout(updateTimelineMarkers, 200);
      }, { once: false });
      plyr.on('ready', () => {
        setTimeout(updateTimelineMarkers, 200);
      });
      
      // Call immediately in case metadata is already loaded
      setTimeout(updateTimelineMarkers, 300);
    }
  }

  function setupSkipHandlers() {
    if (!plyr || !browser) return;
    
    const onTimeUpdate = () => {
      if (!plyr) return;
      
      // Skip intro if enabled and within intro timeline
      if (intro && autoSkipIntro && plyr.currentTime >= intro.start && plyr.currentTime < intro.end) {
        console.log('Skipping intro, jumping to:', intro.end);
        plyr.currentTime = intro.end;
        return;
      }
      
      // Skip outro if enabled and within outro timeline
      if (outro && autoSkipOutro && plyr.currentTime >= outro.start && plyr.currentTime < outro.end) {
        console.log('Skipping outro, jumping to:', outro.end);
        plyr.currentTime = outro.end;
        return;
      }
    };
    
    plyr.on('timeupdate', onTimeUpdate);
    onDestroy(() => plyr && plyr.off('timeupdate', onTimeUpdate));
  }

  $: if (browser && plyr && (intro || outro) && (autoSkipIntro || autoSkipOutro)) {
    setupSkipHandlers();
  }

  function setupAutoPlayPlyr() {
    if (!plyr || !autoPlay || !browser) return;
    
    let autoPlayAttempted = false;
    
    const onCanPlay = () => {
      if (!autoPlayAttempted && plyr) {
        autoPlayAttempted = true;
        plyr.play().catch((err: any) => {
          // Autoplay might be blocked by browser
          console.log('Autoplay blocked or failed:', err);
        });
      }
    };
    
    const onTimeUpdate = () => {
      if (!autoPlayAttempted && plyr && plyr.currentTime > 0) {
        autoPlayAttempted = true;
        plyr.play().catch((err: any) => {
          console.log('Autoplay blocked or failed:', err);
        });
      }
    };
    
    plyr.once('canplay', onCanPlay);
    plyr.on('timeupdate', onTimeUpdate);
  }

  /**
   * Unified handler for video ended event
   * Handles both autoNext and autostop (pause) functionality
   */
  async function handleVideoEnded() {
    console.log('Video ended', { autoNext, autoPlay });
    
    // Ensure video is paused and time is clamped with multiple attempts
    if (videoRef) {
      videoRef.pause();
      videoRef.currentTime = videoRef.duration;
      console.log('Native video paused at:', videoRef.currentTime, 'duration:', videoRef.duration);
      
      // Force pause after a short delay for HLS reliability
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!videoRef.paused) {
        videoRef.pause();
      }
    }
    
    // Also ensure Plyr is paused if it exists
    if (plyr) {
      plyr.pause();
      plyr.currentTime = plyr.duration;
      console.log('Plyr paused at:', plyr.currentTime, 'duration:', plyr.duration);
      
      // Force pause after a short delay
      await new Promise(resolve => setTimeout(resolve, 100));
      if (plyr.playing) {
        plyr.pause();
      }
    }
    
    // If autoNext is enabled, trigger the next episode
    if (autoNext) {
      console.log('Auto-playing next episode');
      // Small delay to ensure UI updates before transition
      await new Promise(resolve => setTimeout(resolve, 500));
      playNext();
    } else {
      console.log('Video stopped - waiting for user interaction');
    }
  }
  
  /**
   * Attach unified video ended handler to both Plyr and native video element
   */
  function attachVideoEndedHandler() {
    if (!browser) return;
    detachVideoEndedHandler();
    
    videoEndedHandler = handleVideoEnded;
    
    if (plyr) {
      plyr.on('ended', videoEndedHandler);
    }
    
    if (videoRef) {
      videoRef.addEventListener('ended', videoEndedHandler, { once: false });
    }
    
    // Start monitoring for videos that don't fire ended event reliably
    startDurationMonitor();
  }
  
  /**
   * Remove unified video ended handler
   */
  function detachVideoEndedHandler() {
    if (!browser) return;
    
    if (videoEndedHandler) {
      if (plyr) {
        plyr.off('ended', videoEndedHandler);
      }
      if (videoRef) {
        videoRef.removeEventListener('ended', videoEndedHandler);
      }
      videoEndedHandler = null;
    }
  }

  /**
   * Start monitoring video duration to ensure it stops at the end
   * This is a fallback for HLS streams where ended event might not fire
   */
  function startDurationMonitor() {
    if (!browser) return;
    
    stopDurationMonitor();
    
    durationCheckInterval = setInterval(() => {
      if (!videoRef || !plyr) return;
      
      // Check if video is near or at the end
      const currentTime = plyr.currentTime || videoRef.currentTime;
      const duration = plyr.duration || videoRef.duration;
      
      // Consider video ended if within 0.5 seconds of duration
      if (duration > 0 && currentTime >= duration - 0.5) {
        console.log('Duration monitor: Video reached end, pausing...', {
          currentTime,
          duration,
          difference: duration - currentTime
        });
        
        // Call the ended handler if it hasn't been called already
        if (!videoRef.paused || (plyr && plyr.playing)) {
          handleVideoEnded();
        }
      }
    }, 100); // Check every 100ms
  }

  /**
   * Stop the duration monitor
   */
  function stopDurationMonitor() {
    if (durationCheckInterval) {
      clearInterval(durationCheckInterval);
      durationCheckInterval = null;
    }
  }

  $: if (browser && plyr && autoPlay) {
    setupAutoPlayPlyr();
  }

  // Re-attach ended handler when autoNext flag or player changes
  $: if (browser && plyr && videoRef) {
    attachVideoEndedHandler();
  }

  // Update timeline markers whenever intro or outro changes (independent of autoskip)
  $: if (browser && plyr && videoRef && intro && outro) {
    setTimeout(() => updateTimelineMarkers(), 50);
  }
  
  $: if (browser && plyr && videoRef && intro && !outro) {
    setTimeout(() => updateTimelineMarkers(), 50);
  }
  
  $: if (browser && plyr && videoRef && !intro && outro) {
    setTimeout(() => updateTimelineMarkers(), 50);
  }
</script>

<div class="player-container">
  <video
    bind:this={videoRef}
    controls
    crossorigin="anonymous"
    playsinline
    {poster}
    class="responsive-video"
  >
    {#if thumbnailsVtt}
      <track kind="metadata" label="thumbnails" src={thumbnailsVtt} />
    {/if}
    <!-- Always include at least one captions track for accessibility -->
    <track kind="captions" label="No captions" srclang="en" src="" default hidden />
    <!-- Subtitle tracks are added dynamically -->
  </video>
  {#if buffering && videoType !== 'application/x-mpegURL'}
    <div class="buffering-spinner" aria-label="Loading">
      <div class="spinner"></div>
    </div>
  {/if}
</div>

<style>
  .player-container {
    position: relative;
    width: 100%;
    max-width: 100%;
    aspect-ratio: 16 / 9;
    background: black;
    border-radius: 0.25rem;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    box-sizing: border-box;
  }

  :global(.plyr),
  :global(.plyr__video-wrapper),
  :global(.plyr video),
  .responsive-video {
    width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
    background: black;
    border-radius: 0.25rem;
    display: block;
    box-sizing: border-box;
  }

  :global(.plyr__captions) {
    font-size: 1.1em;
    color: #fff;
    text-shadow: 0 2px 4px #000, 0 0 2px #000;
    background: none !important;
    padding: 0.2em 0.6em;
    border-radius: 0.15rem;
    line-height: 1.4;
  }

  @media (max-width: 768px) {
    :global(.plyr__captions) {
      font-size: 12px !important;
    }
  }

  :global(.plyr__controls .plyr__control--overlaid) {
    display: block !important;
  }

  :global(.plyr__menu__container .plyr__control[role="menuitemradio"]) {
    color: #fff !important;
  }

  :global(.plyr__menu__container .plyr__control[role="menuitemradio"][aria-checked="true"]) {
    color: #f97316 !important;
  }

  @media (max-width: 768px) {
    :global(.plyr__controls .plyr__volume input[type="range"]) {
      display: none !important;
    }
    :global(.plyr__controls .plyr__volume) {
      min-width: 0 !important;
      width: auto !important;
    }
  }

  :global(.plyr__controls) {
    background: unset !important;
    border-radius: 0 0 0.25rem 0.25rem;
  }

  :global(.plyr--video .plyr__controls) {
    background: linear-gradient(#0000, #000000bf) !important;
    background: var(--plyr-video-controls-background, linear-gradient(#0000, #000000bf)) !important;
    border-bottom-left-radius: inherit;
    border-bottom-right-radius: inherit;
    bottom: 0;
    color: #fff;
    color: var(--plyr-video-control-color, #fff);
    left: 0;
    padding: 5px;
    padding: calc(var(--plyr-control-spacing, 10px)/2);
    padding-top: 20px;
    padding-top: calc(var(--plyr-control-spacing, 10px)*2);
    position: absolute;
    right: 0;
    transition: opacity .4s ease-in-out, transform .4s ease-in-out;
    z-index: 3;
  }

  :global(.plyr) {
    --plyr-color-main: #f97316;
    --plyr-video-background: #18181b;
    --plyr-menu-background: #27272a;
    --plyr-menu-color: #fff;
    --plyr-control-color: #fff;
    --plyr-control-hover-background: #f97316;
    --plyr-tooltip-background: #27272a;
    --plyr-tooltip-color: #fff;
    --plyr-audio-controls-background: #18181b;
    --plyr-audio-control-color: #fff;
    --plyr-audio-control-hover-background: #f97316;
    background: #18181b !important;
    color: #fff !important;
    border-radius: 0.25rem;
  }

  :global(.plyr__control) {
    color: #fff !important;
  }

  :global(.plyr__control[aria-pressed="true"]),
  :global(.plyr__control:hover),
  :global(.plyr__control:focus) {
    background: unset !important;
    color: #f97316 !important;
  }

  :global(.plyr__control[aria-expanded="true"]) {
    background: #f97316 !important;
    color: #18181b !important;
  }

  :global(.plyr__control[aria-expanded="false"]) {
    background: unset !important;
    color: #fff !important;
  }

  :global(.plyr__progress input[type="range"]) {
    color: #f97316 !important;
  }

  :global(.plyr__progress) {
    position: relative !important;
  }

  :global(.plyr__progress [data-timeline-marker]) {
    position: absolute;
    top: 0;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  :global(.plyr__menu__container) {
    background: #27272a !important;
    color: #fff !important;
    border-radius: 0.25rem;
  }

  :global(.plyr__menu__container .plyr__control[role="menuitemradio"][aria-checked="true"]) {
    color: #f97316 !important;
  }

  :global(.plyr__tooltip) {
    background: #27272a !important;
    color: #fff !important;
  }

  :global(.plyr__captions) {
    background: none !important;
    color: #fff !important;
    text-shadow: 0 2px 4px #000, 0 0 2px #000;
  }

  @media (max-width: 640px) {
    :global(.plyr__menu__container) {
      max-height: 150px !important;
      min-width: 90px !important;
      max-width: 140px !important;
      font-size: 0.75rem !important;
      padding: 0.15rem 0.3rem !important;
      border-radius: 0.15rem !important;
      overflow-y: auto !important;
      overscroll-behavior: contain;
    }
    :global(.plyr__menu__container .plyr__control),
    :global(.plyr__menu__container .plyr__menu__value),
    :global(.plyr__menu__container .plyr__control[role="menuitemradio"]) {
      font-size: 0.75rem !important;
      min-height: 24px !important;
      padding: 0.15rem 0.3rem !important;
    }
  }

  @media (max-width: 640px) {
    :global(.plyr__control[data-plyr="captions"]) {
      display: none !important;
    }
  }

  .buffering-spinner {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    pointer-events: none;
    background: rgba(24, 24, 27, 0.18);
    transition: background 0.2s;
  }
  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #f97316;
    border-top: 4px solid #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    box-shadow: 0 0 8px #f9731688;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 640px) {
    .spinner {
      width: 32px;
      height: 32px;
      border-width: 3px;
    }
  }

  :global(.plyr__control[data-plyr="fullscreen"]),
  :global(.plyr__control[data-plyr="fullscreen"]:hover),
  :global(.plyr__control[data-plyr="fullscreen"]:focus),
  :global(.plyr__control[data-plyr="fullscreen"][aria-pressed="true"]) {
    color: #fff !important;
    background: unset !important;
  }

  :global(.plyr__control[data-plyr="play"] svg),
  :global(.plyr__control[data-plyr="pause"] svg),
  :global(.plyr__control[data-plyr="captions"] svg) {
    fill: #fff !important;
    color: #fff !important;
  }
</style>