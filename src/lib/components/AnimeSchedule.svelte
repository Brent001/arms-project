<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let scheduleData: Array<{
    id: string;
    name: string;
    time: string;
    episode: number;
  }> = [];
  let error: string | null = null;
  let currentTime = new Date();
  let selectedDate = getLocalDateString(new Date()); // Use local date string
  let dates: Array<{ date: string; dayName: string; monthName: string }> = [];
  let containerRef: HTMLDivElement | null = null;

  // Helper function to get local date string (YYYY-MM-DD)
  function getLocalDateString(date: Date): string {
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
  }

  // Helper function to create date from local date string
  function createLocalDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const GMTOffset = `GMT ${
    new Date().getTimezoneOffset() > 0 ? '-' : '+'
  }${String(Math.floor(Math.abs(new Date().getTimezoneOffset()) / 60)).padStart(2, '0')}:${String(
    Math.abs(new Date().getTimezoneOffset()) % 60
  ).padStart(2, '0')}`;

  async function fetchSchedule(date: string) {
    try {
      const resp = await fetch(`/api/schedule?date=${date}`);
      const json = await resp.json();
      if (json.success) {
        scheduleData = json.data.scheduledAnimes || [];
      } else {
        error = json.error || 'Failed to fetch schedule';
      }
    } catch (err) {
      console.error('Error fetching schedule:', err);
      error = 'Something went wrong';
    }
  }

  function generateDates() {
    const today = new Date();
    const todayString = getLocalDateString(today);

    // Ensure selectedDate is valid, default to today if not
    if (!selectedDate || selectedDate === '') {
      selectedDate = todayString;
    }

    const prevDates = [];
    const nextDates = [];

    // Generate dates using local date arithmetic
    for (let i = 1; i <= 7; i++) {
      const prevDate = new Date(today);
      prevDate.setDate(today.getDate() - i);
      prevDates.push(prevDate);

      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      nextDates.push(nextDate);
    }

    dates = [
      ...prevDates.reverse(),
      today,
      ...nextDates,
    ].map((date) => ({
      date: getLocalDateString(date),
      dayName: date.toLocaleString('default', { weekday: 'short' }),
      monthName: date.toLocaleString('default', { month: 'short' }),
    }));
  }

  function scrollToSelectedDate() {
    if (!containerRef) return;

    setTimeout(() => {
      const selectedElement = containerRef?.querySelector(
        `div[data-date="${selectedDate}"]`
      ) as HTMLElement;

      if (selectedElement && containerRef) {
        const { offsetWidth: containerWidth } = containerRef;
        const { offsetWidth: elementWidth, offsetLeft: elementPosition } = selectedElement;
        const offset = elementPosition - (containerWidth - elementWidth) / 2;

        containerRef.scrollTo({
          left: Math.max(0, offset),
          behavior: 'smooth',
        });
      }
    }, 100);
  }

  function navigateWeek(direction: 'prev' | 'next') {
    const currentIndex = dates.findIndex((date) => date.date === selectedDate);
    
    if (currentIndex === -1) {
      // If current date not found, regenerate dates and try again
      generateDates();
      return;
    }

    const newIndex =
      direction === 'prev'
        ? Math.max(currentIndex - 1, 0)
        : Math.min(currentIndex + 1, dates.length - 1);

    selectedDate = dates[newIndex].date;
    fetchSchedule(selectedDate);
    scrollToSelectedDate();
  }

  function selectDate(date: string) {
    selectedDate = date;
    fetchSchedule(date);
    scrollToSelectedDate();
  }

  onMount(() => {
    generateDates();
    fetchSchedule(selectedDate);
    
    // Scroll to selected date after component mounts
    setTimeout(() => {
      scrollToSelectedDate();
    }, 200);

    // Update current time every second
    const timer = setInterval(() => {
      currentTime = new Date();
    }, 1000);

    return () => clearInterval(timer);
  });

  // Remove the problematic reactive statement that could cause infinite loops
  // Instead, handle date validation in the functions that modify selectedDate
</script>

<div class="anime-schedule w-full mt-8 xl:mt-0">
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
    <h2 class="font-bold text-xl sm:text-2xl text-orange-400 flex items-center gap-2">
      Estimated Schedule
    </h2>
    <p class="leading-6 px-4 bg-white text-black rounded-full text-sm font-bold flex items-center gap-2">
      ({GMTOffset}) {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
    </p>
  </div>

  <div class="relative px-2 sm:px-4">
    <div
      bind:this={containerRef}
      class="relative my-7 flex w-full flex-nowrap items-center gap-x-2 sm:gap-x-4 overflow-x-auto rounded-xl scrollbar-hide px-10 sm:px-0"
    >
      {#each dates as { date, dayName, monthName }}
        {@const isToday = date === getLocalDateString(new Date())}
        {@const isSelected = selectedDate === date}
        <div
          data-date={date}
          class="shrink-0 flex-grow cursor-pointer rounded-xl bg-white/5 px-8 sm:px-16 py-2 text-center text-secondary-foreground duration-200 hover:bg-white/10 {isSelected ? '!bg-orange-400 text-black' : ''} {isToday && !isSelected ? 'ring-2 ring-orange-400/50' : ''}"
          on:click={() => selectDate(date)}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && selectDate(date)}
        >
          <p class="text-sm sm:text-base font-semibold uppercase">{dayName}</p>
          <p class="text-xs sm:text-sm text-white/60 {isSelected ? 'font-semibold text-black/70' : ''}">
            {monthName} {date.split('-')[2]}
          </p>
        </div>
      {/each}
    </div>

    <button
      class="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-orange-400 text-gray-900 hover:bg-orange-500 hover:text-white px-2 sm:px-4 py-2 shadow transition z-10"
      on:click={() => navigateWeek('prev')}
      aria-label="Previous Week"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-4 h-4 sm:w-5 sm:h-5">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <button
      class="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-orange-400 text-gray-900 hover:bg-orange-500 hover:text-white px-2 sm:px-4 py-2 shadow transition z-10"
      on:click={() => navigateWeek('next')}
      aria-label="Next Week"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-4 h-4 sm:w-5 sm:h-5">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>

  {#if error}
    <div class="w-full h-16 flex justify-center items-center text-red-500">
      {error}
    </div>
  {:else if scheduleData.length === 0}
    <div class="w-full h-16 flex justify-center items-center text-gray-400">
      No data to display
    </div>
  {:else}
    <div class="flex flex-col mt-5 gap-4">
      {#each scheduleData as { id, name, time, episode }}
        <div
          class="group flex w-full items-center justify-between py-2 text-sm sm:text-base duration-200 hover:!text-orange-400 cursor-pointer"
          on:click={() => goto(`/info/${id}`)}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && goto(`/info/${id}`)}
        >
          <div class="flex gap-2 sm:gap-3 items-center">
            <h4 class="font-semibold text-gray-400 duration-200 group-hover:text-orange-400">{time}</h4>
            <h4 class="line-clamp-2 group-hover:text-orange-400">{name}</h4>
          </div>

          <div class="flex shrink-0 gap-1 rounded px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm duration-200 group-hover:bg-orange-400 group-hover:text-black">
            <span>Episode {episode}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .anime-schedule {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
  }

  .scrollbar-hide {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE 10+ */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Edge */
  }
</style>