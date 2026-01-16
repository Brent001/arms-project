<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';

  export let episodeId: string;
  export let category: string;
  export let animeInfo: any;
  export let episodeNum: number;
  export let episodes: any[] = [];
  export let playNext: (nextId: string) => void = () => {};
  export let autoNext: boolean = false;
  export let apiIframeUrl: string | null = null;
  export let currentServer: string = 'hd-2';

  // Extract code after ep= if present, else use episodeId
  function getIframeEpisodeCode(id: string) {
    const match = id.match(/ep=(\d+)/);
    return match ? match[1] : id;
  }

  // Use only VITE_BASE_IFRAME_URL for iframe src
  const baseURL = import.meta.env.VITE_BASE_IFRAME_URL;
  const loading = writable(true);
  const iframeLoaded = writable(false);

  $: code = getIframeEpisodeCode(episodeId);
  $: iframeSrc = (() => {
    const serverLower = currentServer.toLowerCase();
    
    // For HD-2, use megaplay.buzz
    if (serverLower === 'hd-2' && baseURL) {
      console.log('Using HD-2 megaplay URL:', `${baseURL}/${code}/${category}`);
      return `${baseURL}/${code}/${category}`;
    }
    // For HD-1 and HD-3, use API iframe URL
    if ((serverLower === 'hd-1' || serverLower === 'hd-3') && apiIframeUrl) {
      const urlWithDebug = `${apiIframeUrl}&_debug=true`;
      console.log('Using API iframe URL for', currentServer, ':', urlWithDebug);
      return urlWithDebug;
    }
    console.log('No iframe URL found - currentServer:', currentServer, 'apiIframeUrl:', apiIframeUrl, 'baseURL:', baseURL);
    return '';
  })();

  let currentEpisodeIndex = episodes?.findIndex(
    (episode) => episode.episodeId === episodeId
  );
  let iframeRef: HTMLIFrameElement;
  let adBlockerActive = true;

  // Watch for episodes change
  $: if (episodes?.length > 0) {
    currentEpisodeIndex = episodes.findIndex(
      (episode) => episode.episodeId === episodeId
    );
  }

  // Advanced Ad Blocker Configuration
  const adBlockFilters = {
    // Common ad domains and patterns
    domains: [
      'doubleclick.net', 'googleadservices.com', 'googlesyndication.com',
      'googletagmanager.com', 'google-analytics.com', 'facebook.com/tr',
      'scorecardresearch.com', 'outbrain.com', 'taboola.com', 'adsystem.com',
      'amazon-adsystem.com', 'adsafeprotected.com', 'moatads.com',
      'quantserve.com', 'rubiconproject.com', 'pubmatic.com', 'openx.net',
      'adsymptotic.com', 'adnxs.com', 'rlcdn.com', 'krxd.net', 'adskeeper.co.uk',
      'propellerads.com', 'popcash.net', 'popads.net', 'exoclick.com',
      'juicyads.com', 'trafficjunky.com', 'ads.yahoo.com', 'media.net',
      'bidswitch.net', 'casalemedia.com', 'contextweb.com', 'turn.com'
    ],
    
    // URL patterns to block
    urlPatterns: [
      /\/ads?\//i, /\/ad\//i, /\/advertisement/i, /\/advert/i,
      /\/banner/i, /\/popup/i, /\/popunder/i, /\/sponsor/i,
      /\/analytics/i, /\/tracking/i, /\/metric/i, /\/telemetry/i,
      /\/affiliate/i, /\/referral/i, /\/click/i, /\/impression/i,
      /googletagmanager/i, /doubleclick/i, /googleadservices/i,
      /googlesyndication/i, /facebook\.com\/tr/i, /outbrain/i,
      /taboola/i, /adsystem/i, /amazon-adsystem/i, /adsafeprotected/i,
      /moatads/i, /quantserve/i, /rubiconproject/i, /pubmatic/i,
      /openx/i, /adsymptotic/i, /adnxs/i, /rlcdn/i, /krxd/i,
      /propellerads/i, /popcash/i, /popads/i, /exoclick/i,
      /juicyads/i, /trafficjunky/i, /bidswitch/i, /casalemedia/i,
      /contextweb/i, /turn\.com/i, /adskeeper/i
    ],
    
    // Element selectors to block
    selectors: [
      'iframe[src*="ads"]', 'iframe[src*="doubleclick"]', 'iframe[src*="googleadservices"]',
      'iframe[src*="googlesyndication"]', 'iframe[src*="amazon-adsystem"]',
      'div[class*="ad-"]', 'div[id*="ad-"]', 'div[class*="ads-"]', 'div[id*="ads-"]',
      'div[class*="advertisement"]', 'div[id*="advertisement"]', 'div[class*="sponsor"]',
      'div[id*="sponsor"]', 'div[class*="banner"]', 'div[id*="banner"]',
      'div[class*="popup"]', 'div[id*="popup"]', 'div[class*="popunder"]',
      'div[id*="popunder"]', 'div[class*="overlay"]', 'div[id*="overlay"]',
      'a[href*="ads"]', 'a[href*="click"]', 'a[href*="track"]',
      'a[href*="affiliate"]', 'a[href*="referral"]', 'a[style*="position: absolute"]',
      'a[style*="position: fixed"]', 'a[style*="z-index: 999"]',
      'a[style*="opacity: 0"]', 'a[style*="visibility: hidden"]',
      'div[style*="position: absolute"][style*="z-index"]',
      'div[style*="position: fixed"][style*="z-index"]'
    ]
  };

  // Anti-detection measures
  function setupAntiDetection() {
    if (typeof window === 'undefined') return;

    // Spoof common ad blocker detection methods
    const nativeDefineProperty = Object.defineProperty;
    const nativeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    
    // Override common detection properties
    try {
      // Spoof AdBlock detection
      Object.defineProperty(window, 'adblockDetected', {
        get: () => false,
        set: () => {},
        configurable: false
      });
      
      // Spoof uBlock Origin detection
      Object.defineProperty(window, 'uBlockOrigin', {
        get: () => undefined,
        set: () => {},
        configurable: false
      });
      
      // Spoof AdBlock Plus detection
      Object.defineProperty(window, 'adblockplus', {
        get: () => undefined,
        set: () => {},
        configurable: false
      });
      
      // Override common ad blocker detection functions
      window.getComputedStyle = new Proxy(window.getComputedStyle, {
        apply: function(target, thisArg, args) {
          // Ensure the arguments match the expected signature
          const [elt, pseudoElt] = args;
          const result = target.call(thisArg, elt, pseudoElt);
          if (elt && elt.id && elt.id.includes('ad')) {
            return new Proxy(result, {
              get: function(target, prop) {
                if (prop === 'display') return 'block';
                if (prop === 'visibility') return 'visible';
                if (prop === 'opacity') return '1';
                return Reflect.get(target, prop);
              }
            });
          }
          return result;
        }
      });
      
      // Override getBoundingClientRect for hidden ads
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function() {
        const rect = originalGetBoundingClientRect.call(this);
        // Fix: Use proper array indexing with type assertion
        if (this.id && this.id.includes('ad') && rect.height === 0) {
          return new DOMRect(0, 0, 300, 250);
        }
        return rect;
      };
      
      // Prevent sandboxing detection
      Object.defineProperty(window, 'frameElement', {
        get: () => null,
        configurable: false
      });
      
      Object.defineProperty(window, 'parent', {
        get: () => window,
        configurable: false
      });
      
      Object.defineProperty(window, 'top', {
        get: () => window,
        configurable: false
      });
      
    } catch (e) {
      console.warn('Anti-detection setup failed:', e);
    }
  }

  // Advanced request interceptor
  function setupRequestInterceptor() {
    if (typeof window === 'undefined') return;

    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      
      // Check if URL should be blocked
      if (shouldBlockRequest(url)) {
        console.log('Blocked fetch request:', url);
        return Promise.reject(new Error('Blocked by ad blocker'));
      }
      
      return originalFetch(input, init);
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
      const urlString = typeof url === 'string' ? url : url.href;
      if (shouldBlockRequest(urlString)) {
        console.log('Blocked XHR request:', urlString);
        this.abort();
        return;
      }
      return originalXHROpen.call(this, method, url, async !== undefined ? async : true, username, password);
    };
  }

  // Check if request should be blocked
  function shouldBlockRequest(url: string): boolean {
    if (!url || !adBlockerActive) return false;
    
    // Check against domain blacklist
    for (const domain of adBlockFilters.domains) {
      if (url.includes(domain)) return true;
    }
    
    // Check against URL patterns
    for (const pattern of adBlockFilters.urlPatterns) {
      if (pattern.test(url)) return true;
    }
    
    return false;
  }

  // Remove ad elements from DOM
  function removeAdElements() {
    if (typeof document === 'undefined') return;
    
    adBlockFilters.selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element && element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });
      } catch (e) {
        // Ignore selector errors
      }
    });
  }

  // Block invisible/hidden clickable elements
  function blockInvisibleLinks() {
    if (typeof document === 'undefined') return;
    
    const links = document.querySelectorAll('a, div[onclick], span[onclick]');
    links.forEach(link => {
      const htmlElement = link as HTMLElement;
      const style = window.getComputedStyle(htmlElement);
      const rect = htmlElement.getBoundingClientRect();
      
      // Check for invisible/hidden elements that might be clickable
      if (
        style.opacity === '0' ||
        style.visibility === 'hidden' ||
        style.display === 'none' ||
        rect.width === 0 ||
        rect.height === 0 ||
        (style.position === 'absolute' && (style.left === '-9999px' || style.top === '-9999px'))
      ) {
        htmlElement.style.pointerEvents = 'none';
        htmlElement.onclick = null;
        htmlElement.removeAttribute('href');
        htmlElement.removeAttribute('onclick');
      }
    });
  }

  // Setup iframe sandbox protection
  function setupIframeProtection() {
    if (!iframeRef) return;
    
    // Add security attributes to iframe
    iframeRef.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-presentation');
    
    // Monitor iframe for ad injections
    const checkIframeContent = () => {
      try {
        if (iframeRef.contentDocument) {
          const iframeDoc = iframeRef.contentDocument;
          
          // Remove ad elements from iframe
          adBlockFilters.selectors.forEach(selector => {
            try {
              const elements = iframeDoc.querySelectorAll(selector);
              elements.forEach(element => {
                if (element && element.parentNode) {
                  element.parentNode.removeChild(element);
                }
              });
            } catch (e) {
              // Cross-origin restrictions
            }
          });
          
          // Block invisible links in iframe
          const iframeLinks = iframeDoc.querySelectorAll('a, div[onclick], span[onclick]');
          iframeLinks.forEach(link => {
            const htmlElement = link as HTMLElement;
            const defaultView = iframeDoc.defaultView;
            if (defaultView) {
              const style = defaultView.getComputedStyle(htmlElement);
              if (style.opacity === '0' || style.visibility === 'hidden') {
                htmlElement.style.pointerEvents = 'none';
                htmlElement.onclick = null;
              }
            }
          });

          // Hide scrollbars in iframe content
          try {
            const iframeBody = iframeDoc.body;
            const iframeHtml = iframeDoc.documentElement;
            if (iframeBody) {
              iframeBody.style.overflow = 'hidden';
              iframeBody.style.scrollbarWidth = 'none';
              (iframeBody.style as any)['msOverflowStyle'] = 'none';
            }
            if (iframeHtml) {
              iframeHtml.style.overflow = 'hidden';
              iframeHtml.style.scrollbarWidth = 'none';
              (iframeHtml.style as any)['msOverflowStyle'] = 'none';
            }
            
            // Inject CSS to hide scrollbars
            const hideScrollbarCSS = `
              <style>
                * {
                  scrollbar-width: none !important;
                  -ms-overflow-style: none !important;
                }
                *::-webkit-scrollbar {
                  display: none !important;
                  width: 0 !important;
                  height: 0 !important;
                }
                html, body {
                  overflow: hidden !important;
                  scrollbar-width: none !important;
                  -ms-overflow-style: none !important;
                }
              </style>
            `;
            
            if (iframeDoc.head && !iframeDoc.head.querySelector('#hide-scrollbar-style')) {
              const style = iframeDoc.createElement('style');
              style.id = 'hide-scrollbar-style';
              style.innerHTML = hideScrollbarCSS.replace(/<\/?style>/g, '');
              iframeDoc.head.appendChild(style);
            }
          } catch (e) {
            // Cross-origin restrictions
          }
        }
      } catch (e) {
        // Cross-origin restrictions prevent access
      }
    };
    
    // Check periodically
    setInterval(checkIframeContent, 1000);
  }

  // Listen for messages from iframe for autoNext
  function handleMessage(event: MessageEvent) {
    // Block potential malicious messages
    if (event.origin && shouldBlockRequest(event.origin)) {
      return;
    }
    
    const { currentTime, duration } = event.data || {};
    if (
      typeof currentTime === 'number' &&
      typeof duration === 'number' &&
      currentTime >= duration &&
      currentEpisodeIndex < episodes.length - 1 &&
      autoNext
    ) {
      const nextEpId = episodes[currentEpisodeIndex + 1].episodeId;
      if (nextEpId) playNext(nextEpId);
    }
  }

  // CSS injection for additional ad blocking and scrollbar hiding
  function injectAdBlockCSS() {
    if (typeof document === 'undefined') return;
    
    const css = `
      /* Hide common ad containers */
      [id*="ad-"], [class*="ad-"], [id*="ads-"], [class*="ads-"],
      [id*="advertisement"], [class*="advertisement"],
      [id*="sponsor"], [class*="sponsor"], [id*="banner"], [class*="banner"],
      [id*="popup"], [class*="popup"], [id*="popunder"], [class*="popunder"],
      [id*="overlay"], [class*="overlay"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        width: 0 !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
        z-index: -1 !important;
      }
      
      /* Block invisible clickable elements */
      a[style*="opacity: 0"], a[style*="visibility: hidden"],
      div[onclick][style*="opacity: 0"], div[onclick][style*="visibility: hidden"],
      span[onclick][style*="opacity: 0"], span[onclick][style*="visibility: hidden"] {
        pointer-events: none !important;
        cursor: default !important;
      }
      
      /* Block fixed positioned overlays */
      div[style*="position: fixed"][style*="z-index: 999"],
      div[style*="position: absolute"][style*="z-index: 999"] {
        display: none !important;
      }
      
      /* Block common ad iframe containers */
      iframe[src*="ads"], iframe[src*="doubleclick"], iframe[src*="googleadservices"],
      iframe[src*="googlesyndication"], iframe[src*="amazon-adsystem"] {
        display: none !important;
      }
      
      /* Hide scrollbars globally */
      * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      
      *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
      }
      
      /* Hide scrollbars on iframe */
      iframe {
        scrolling: no !important;
      }
      
      /* Enable screen rotation in fullscreen */
      @media (orientation: landscape) {
        iframe:fullscreen {
          transform: rotate(0deg);
        }
      }
      
      @media (orientation: portrait) {
        iframe:fullscreen {
          transform: rotate(90deg);
        }
      }
      
      /* Allow rotation for mobile devices */
      @media screen and (max-width: 768px) {
        iframe:fullscreen {
          transform: rotate(0deg);
        }
      }
    `;
    
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function isMobileDevice() {
    return typeof window !== 'undefined' &&
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.matchMedia('(max-width: 768px)').matches);
  }

  async function lockToLandscape() {
    if (!isMobileDevice()) return;
    try {
      // Fix: Add proper type checking and fallback
      if (screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch (e) {}
  }

  async function unlockOrientation() {
    if (!isMobileDevice()) return;
    try {
      // Fix: Add proper type checking and fallback
      if (screen.orientation && 'unlock' in screen.orientation) {
        (screen.orientation as any).unlock();
      }
    } catch (e) {}
  }

  // Listen for fullscreen changes on the iframe
  function setupFullscreenOrientation() {
    if (!iframeRef) return;
    function onFullscreenChange() {
      const isFullscreen =
        document.fullscreenElement === iframeRef ||
        (iframeRef as any).webkitFullscreenElement === iframeRef;
      if (isFullscreen) {
        lockToLandscape();
      } else {
        unlockOrientation();
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    // Clean up
    onDestroy(() => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    });
  }

  onMount(() => {
    setupAntiDetection();
    setupRequestInterceptor();
    
    // Start monitoring for ads
    const adCheckInterval = setInterval(() => {
      removeAdElements();
      blockInvisibleLinks();
    }, 500);
    
    // Setup iframe protection when loaded
    const iframeLoadHandler = () => {
      setTimeout(() => {
        setupIframeProtection();
      }, 100);
    };
    
    window.addEventListener('message', handleMessage);
    
    setupFullscreenOrientation();

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(adCheckInterval);
      
      // Save continue watching
      if (animeInfo?.data_id) {
        const continueWatching = JSON.parse(localStorage.getItem('continueWatching') || '[]');
        const newEntry = {
          id: animeInfo?.id,
          data_id: animeInfo?.data_id,
          episodeId,
          episodeNum,
          adultContent: animeInfo?.adultContent,
          poster: animeInfo?.poster,
          title: animeInfo?.title,
          japanese_title: animeInfo?.japanese_title,
        };
        const existingIndex = continueWatching.findIndex(
          (item: any) => item.data_id === newEntry.data_id
        );
        if (existingIndex !== -1) {
          continueWatching[existingIndex] = newEntry;
        } else {
          continueWatching.push(newEntry);
        }
        localStorage.setItem('continueWatching', JSON.stringify(continueWatching));
      }
    };
  });
</script>

<!-- Add a isolation wrapper to prevent iframe from affecting other CSS effects -->
<div class="iframe-isolation-wrapper">
  <div class="relative w-full h-full overflow-hidden iframe-container">
    <!-- Loader Overlay -->
    {#if $loading}
      <div class="absolute inset-0 flex justify-center items-center bg-black bg-opacity-50 z-10 transition-opacity duration-500 opacity-100 pointer-events-auto">
        <span class="loader"></span>
      </div>
    {/if}

    <iframe
      bind:this={iframeRef}
      src={iframeSrc}
      allowfullscreen
      allow="fullscreen; autoplay; encrypted-media; gyroscope; accelerometer; picture-in-picture; screen-wake-lock"
      title="Video Player"
      sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
      scrolling="no"
      class="w-full h-full transition-opacity duration-500 no-scrollbar iframe-isolated"
      style="opacity: {$iframeLoaded ? 1 : 0}; overflow: hidden;"
      on:load={() => {
        iframeLoaded.set(true);
        setTimeout(() => {
          loading.set(false);
          setupIframeProtection();
        }, 200);
      }}
    ></iframe>
  </div>
</div>

<style>
  /* Only keep styles scoped to the iframe wrapper/component */
  .iframe-isolation-wrapper {
    position: relative;
    z-index: 1;
    isolation: isolate;
    contain: layout style paint;
    width: 100%;
    height: 100%;
    overflow: hidden;
    transform: translateZ(0);
    will-change: transform;
    /* Remove backdrop-filter here to avoid interfering with global effects */
  }

  .iframe-container {
    overflow: hidden !important;
    position: relative;
    z-index: 0;
  }

  .iframe-isolated {
    position: relative;
    z-index: 0;
    transform: translate3d(0, 0, 0);
    contain: strict;
    /* Remove backdrop-filter and filter here */
  }

  .no-scrollbar {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
    overflow: hidden !important;
  }

  .no-scrollbar::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }

  .loader {
    width: 2rem;
    height: 2rem;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #f97316;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: block;
  }

  @keyframes spin {
    0% { transform: rotate(0deg);}
    100% { transform: rotate(360deg);}
  }

  /* Remove all :global rules from this file! Move them to your global stylesheet. */
</style>