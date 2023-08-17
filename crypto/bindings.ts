import { prefixHashes, prefixHashesLegacy } from '../crypto/constants.js';

const tsBindings = {
  prefixHashes,
  prefixHashesLegacy,
};

// this is put in a global variable so that ../kimchi/js/bindings.js finds it
(globalThis as any).__snarkyTsBindings = tsBindings;
