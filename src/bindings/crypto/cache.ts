import type { Cache } from '../../lib/proof-system/cache.js';

export { setSrsCache, srsCache, unsetSrsCache };

let srsCache: Cache | undefined;

function setSrsCache(cache: Cache) {
  srsCache = cache;
}

function unsetSrsCache() {
  srsCache = undefined;
}
