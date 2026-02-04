<script lang="ts">
  export let onConfirm: () => void;
  export let onReject: () => void;
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2">
  <div class="bg-gradient-to-br from-[#2a0008] via-[#3a0d16] to-[#1a0106] border border-[#ff003c]/40 rounded-2xl shadow-2xl p-4 max-w-xs w-full text-center animate-fade-in">
    <div class="flex flex-col items-center mb-2">
      <div class="bg-[#ff003c]/10 p-1.5 rounded-full border border-[#ff003c]/30 mb-2">
        <svg class="w-7 h-7 text-[#ff003c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      </div>
      <h2 class="text-base font-bold text-[#ff003c] mb-1 tracking-tight">18+ Content</h2>
    </div>
    <p class="text-[#ffb3c6] text-xs leading-snug mb-4">
      This section contains explicit material.<br>
      By continuing, you confirm you are <span class="text-[#ff003c] font-bold">18+</span> and legally permitted to view such content.
    </p>
    <div class="flex flex-col gap-2">
      <button
        class="w-full bg-[#ff003c] hover:bg-[#c2002e] text-white font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200"
        on:click={onConfirm}
      >
        Yes, I am 18+
      </button>
      <button
        class="w-full bg-transparent hover:bg-[#ff003c]/10 text-[#ff003c] font-semibold px-4 py-2 rounded-lg border border-[#ff003c]/40 shadow transition-all duration-200"
        on:click={onReject}
      >
        No, take me back
      </button>
    </div>
  </div>
</div>

<style>
  .animate-fade-in {
    animation: fade-in 0.4s ease-out;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: scale(0.95) translateY(20px);}
    to { opacity: 1; transform: scale(1) translateY(0);}
  }
</style>