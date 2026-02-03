import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ params, fetch }: { params: { id: string }, fetch: typeof window.fetch }) => {
  const id = params.id;
  if (!id) {
    return { info: null };
  }

  const res = await fetch(`/api/hanime/info?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    return { info: null };
  }

  const data = await res.json();
  // Extract the series info from the new API structure
  return { info: data?.data?.data ?? null };
};