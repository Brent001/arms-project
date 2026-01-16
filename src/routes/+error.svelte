<script lang="ts">
  import { page } from '$app/stores';
  import Navbar from '$lib/components/Navbar.svelte';
  import NavbarHanime from '$lib/components/hanime/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import FooterHanime from '$lib/components/hanime/Footer.svelte';

  const isHanime = $page.url.pathname.startsWith('/hanime');
  const colors = isHanime ? {
    bg: 'from-[#2a0008] via-[#3a0d16] to-[#1a0106]',
    primary: 'from-[#ff003c] to-[#ff6b8a]',
    primaryLight: '#ffb3c6',
    secondary: '#d4a5b5',
    tertiary: '#a87a95',
    bgGradient: 'from-[#ff003c]/20 to-[#c2002e]/10',
    borderColor: 'border-[#ff003c]/40',
    bgCard: 'bg-[#3a0d16] hover:bg-[#5a1325] border border-[#ff003c]/20',
    button: 'bg-[#ff003c] hover:bg-[#c2002e]',
    buttonBorder: 'border-[#ff003c]/50'
  } : {
    bg: 'from-gray-900 via-gray-800 to-gray-900',
    primary: 'from-orange-400 to-orange-600',
    primaryLight: 'text-orange-300',
    secondary: 'text-gray-300',
    tertiary: 'text-gray-400',
    bgGradient: 'from-orange-400/20 to-orange-600/10',
    borderColor: 'border-orange-400/40',
    bgCard: 'bg-gray-800 hover:bg-gray-700',
    button: 'bg-orange-400 hover:bg-orange-300',
    buttonBorder: 'border-orange-400/50'
  };
</script>

<svelte:head>
  <title>Error - ARMS {isHanime ? 'Hanime' : 'Anime'}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b {colors.bg} text-white flex flex-col">
  {#if isHanime}
    <NavbarHanime />
  {:else}
    <Navbar />
  {/if}
  
  <div class="mt-16 sm:mt-0"></div>

  <!-- Compact Error Section -->
  <section class="flex-1 w-full px-4 py-6 sm:py-8 relative overflow-hidden flex items-center">
    <!-- Animated Background Elements with Glitch -->
    <div class="absolute inset-0 opacity-10">
      <div class="bg-glitch-1 absolute top-1/3 left-1/3 w-40 h-40 sm:w-56 sm:h-56 {isHanime ? 'bg-[#ff003c]' : 'bg-orange-400'} rounded-full blur-3xl animate-pulse"></div>
      <div class="bg-glitch-2 absolute bottom-1/3 right-1/3 w-48 h-48 sm:w-64 sm:h-64 {isHanime ? 'bg-[#c2002e]' : 'bg-orange-600'} rounded-full blur-3xl animate-pulse" style="animation-delay: 1s"></div>
      
      <!-- Additional glitch layers -->
      <div class="bg-glitch-3 absolute top-1/2 right-1/4 w-32 h-32 sm:w-40 sm:h-40 {isHanime ? 'bg-[#ff003c]' : 'bg-orange-500'} rounded-full blur-2xl opacity-50"></div>
      <div class="bg-glitch-4 absolute bottom-1/4 left-1/4 w-36 h-36 sm:w-48 sm:h-48 {isHanime ? 'bg-[#c2002e]' : 'bg-orange-400'} rounded-full blur-2xl opacity-50" style="animation-delay: 0.5s"></div>
    </div>

    <div class="max-w-3xl mx-auto relative z-10 w-full">
      <!-- Compact Error Display -->
      <div class="text-center mb-4 sm:mb-5">
        <div class="relative inline-block">
          <h1 class="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r {colors.primary} leading-none glitch" data-text={$page.status}>
            {$page.status}
          </h1>
          <div class="absolute inset-0 text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r {colors.primary} opacity-70 blur-sm leading-none animate-pulse-slow">
            {$page.status}
          </div>
        </div>
        <p class="{isHanime ? 'text-[#ffb3c6]' : 'text-orange-300'} font-semibold text-base sm:text-lg mt-2 uppercase tracking-wide">
          {$page.error?.message || 'Something went wrong'}
        </p>
        <p class="{colors.secondary} text-xs sm:text-sm mt-1.5 max-w-md mx-auto">
          {#if $page.status === 404}
            The page you're looking for doesn't exist or has been moved.
          {:else if $page.status === 500}
            Our servers are experiencing issues. We're working on it!
          {:else}
            An unexpected error occurred. Our team has been notified.
          {/if}
        </p>
      </div>

      <!-- Compact Action Buttons -->
      <div class="flex items-center justify-center gap-2.5">
        <a
          href={isHanime ? '/hanime' : '/'}
          class="group flex-1 sm:flex-initial sm:w-auto px-4 py-2 sm:px-6 sm:py-2.5 {colors.button} {isHanime ? 'text-white' : 'text-gray-900'} font-semibold text-sm rounded-lg shadow-lg transition-all duration-300 sm:hover:scale-105 flex items-center justify-center gap-2"
        >
          <svg class="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Return Home</span>
        </a>
        
        <a
          href={isHanime ? '/hanime/random' : '/recently-added'}
          class="group flex-1 sm:flex-initial sm:w-auto px-4 py-2 sm:px-6 sm:py-2.5 bg-transparent border-2 {colors.buttonBorder} {isHanime ? 'text-[#ff003c] hover:bg-[#ff003c]/10' : 'text-orange-400 hover:bg-orange-400/10'} font-semibold text-sm rounded-lg transition-all duration-300 sm:hover:scale-105 flex items-center justify-center gap-2"
        >
          <span>Explore Content</span>
          <svg class="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>
    </div>
  </section>

  {#if isHanime}
    <FooterHanime />
  {:else}
    <Footer />
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.3;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.1);
    }
  }

  .animate-pulse {
    animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse-slow {
    0%, 100% {
      opacity: 0.7;
    }
    50% {
      opacity: 0.3;
    }
  }

  .animate-pulse-slow {
    animation: pulse-slow 3s ease-in-out infinite;
  }

  /* Background Glitch Animations */
  @keyframes bg-glitch-1 {
    0%, 100% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    10% {
      transform: translate(-3px, 2px) scale(1.02);
      opacity: 0.9;
    }
    20% {
      transform: translate(2px, -3px) scale(0.98);
      opacity: 1;
    }
    30% {
      transform: translate(-2px, -2px) scale(1.01);
      opacity: 0.95;
    }
    40% {
      transform: translate(3px, 3px) scale(0.99);
      opacity: 1;
    }
    50% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
  }

  @keyframes bg-glitch-2 {
    0%, 100% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    15% {
      transform: translate(2px, -2px) scale(1.01);
      opacity: 0.95;
    }
    25% {
      transform: translate(-3px, 3px) scale(0.99);
      opacity: 1;
    }
    35% {
      transform: translate(3px, -3px) scale(1.02);
      opacity: 0.9;
    }
    45% {
      transform: translate(-2px, 2px) scale(0.98);
      opacity: 1;
    }
    55% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
  }

  @keyframes bg-glitch-3 {
    0%, 100% {
      transform: translate(0, 0) scale(1) rotate(0deg);
      opacity: 0.5;
    }
    12% {
      transform: translate(-4px, 3px) scale(1.03) rotate(1deg);
      opacity: 0.4;
    }
    24% {
      transform: translate(3px, -4px) scale(0.97) rotate(-1deg);
      opacity: 0.5;
    }
    36% {
      transform: translate(-3px, -3px) scale(1.02) rotate(0.5deg);
      opacity: 0.45;
    }
    48% {
      transform: translate(4px, 4px) scale(0.98) rotate(-0.5deg);
      opacity: 0.5;
    }
    60% {
      transform: translate(0, 0) scale(1) rotate(0deg);
      opacity: 0.5;
    }
  }

  @keyframes bg-glitch-4 {
    0%, 100% {
      transform: translate(0, 0) scale(1) rotate(0deg);
      opacity: 0.5;
    }
    18% {
      transform: translate(3px, -3px) scale(1.02) rotate(-1deg);
      opacity: 0.45;
    }
    28% {
      transform: translate(-4px, 4px) scale(0.98) rotate(1deg);
      opacity: 0.5;
    }
    38% {
      transform: translate(4px, 3px) scale(1.01) rotate(-0.5deg);
      opacity: 0.4;
    }
    48% {
      transform: translate(-3px, -4px) scale(0.99) rotate(0.5deg);
      opacity: 0.5;
    }
    58% {
      transform: translate(0, 0) scale(1) rotate(0deg);
      opacity: 0.5;
    }
  }

  .bg-glitch-1 {
    animation: bg-glitch-1 5s ease-in-out infinite;
  }

  .bg-glitch-2 {
    animation: bg-glitch-2 6s ease-in-out infinite;
  }

  .bg-glitch-3 {
    animation: bg-glitch-3 7s ease-in-out infinite;
  }

  .bg-glitch-4 {
    animation: bg-glitch-4 5.5s ease-in-out infinite;
  }

  /* Text Glitch Animations */
  @keyframes glitch {
    0% {
      text-shadow: 0.05em 0 0 rgba(255, 0, 60, 0.75),
                  -0.05em -0.025em 0 rgba(0, 255, 255, 0.75),
                  -0.025em 0.05em 0 rgba(0, 255, 0, 0.75);
    }
    14% {
      text-shadow: 0.05em 0 0 rgba(255, 0, 60, 0.75),
                  -0.05em -0.025em 0 rgba(0, 255, 255, 0.75),
                  -0.025em 0.05em 0 rgba(0, 255, 0, 0.75);
    }
    15% {
      text-shadow: -0.05em -0.025em 0 rgba(255, 0, 60, 0.75),
                  0.025em 0.025em 0 rgba(0, 255, 255, 0.75),
                  -0.05em -0.05em 0 rgba(0, 255, 0, 0.75);
    }
    49% {
      text-shadow: -0.05em -0.025em 0 rgba(255, 0, 60, 0.75),
                  0.025em 0.025em 0 rgba(0, 255, 255, 0.75),
                  -0.05em -0.05em 0 rgba(0, 255, 0, 0.75);
    }
    50% {
      text-shadow: 0.025em 0.05em 0 rgba(255, 0, 60, 0.75),
                  0.05em 0 0 rgba(0, 255, 255, 0.75),
                  0 -0.05em 0 rgba(0, 255, 0, 0.75);
    }
    99% {
      text-shadow: 0.025em 0.05em 0 rgba(255, 0, 60, 0.75),
                  0.05em 0 0 rgba(0, 255, 255, 0.75),
                  0 -0.05em 0 rgba(0, 255, 0, 0.75);
    }
    100% {
      text-shadow: -0.025em 0 0 rgba(255, 0, 60, 0.75),
                  -0.025em -0.025em 0 rgba(0, 255, 255, 0.75),
                  -0.025em -0.05em 0 rgba(0, 255, 0, 0.75);
    }
  }

  .glitch {
    position: relative;
    animation: glitch 1.5s infinite;
  }

  .glitch::before,
  .glitch::after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .glitch::before {
    animation: glitch-before 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
    color: rgba(255, 0, 60, 0.8);
    z-index: -1;
  }

  .glitch::after {
    animation: glitch-after 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite reverse;
    color: rgba(0, 255, 255, 0.8);
    z-index: -2;
  }

  @keyframes glitch-before {
    0% {
      clip-path: inset(40% 0 61% 0);
      transform: translate(-2px, -2px);
    }
    20% {
      clip-path: inset(92% 0 1% 0);
      transform: translate(2px, 2px);
    }
    40% {
      clip-path: inset(43% 0 1% 0);
      transform: translate(-2px, 2px);
    }
    60% {
      clip-path: inset(25% 0 58% 0);
      transform: translate(2px, -2px);
    }
    80% {
      clip-path: inset(54% 0 7% 0);
      transform: translate(-2px, -2px);
    }
    100% {
      clip-path: inset(58% 0 43% 0);
      transform: translate(2px, 2px);
    }
  }

  @keyframes glitch-after {
    0% {
      clip-path: inset(50% 0 30% 0);
      transform: translate(2px, 2px);
    }
    20% {
      clip-path: inset(10% 0 80% 0);
      transform: translate(-2px, -2px);
    }
    40% {
      clip-path: inset(65% 0 15% 0);
      transform: translate(2px, -2px);
    }
    60% {
      clip-path: inset(5% 0 70% 0);
      transform: translate(-2px, 2px);
    }
    80% {
      clip-path: inset(75% 0 12% 0);
      transform: translate(2px, 2px);
    }
    100% {
      clip-path: inset(35% 0 48% 0);
      transform: translate(-2px, -2px);
    }
  }
</style>