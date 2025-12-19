import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ url }) => {
  const list = url.searchParams.get('list') || 'anime';

  return { list };
};
