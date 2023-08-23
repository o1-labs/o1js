/**
 * This file contains bindings for JSOO written in TS and integrated with our normal code base.
 * It is exposed to JSOO by populating a global variable with an object.
 * It gets imported as the first thing in ../../snarky.js so that the global variable is ready by the time JSOO code gets executed.
 */
import { prefixHashes, prefixHashesLegacy } from '../crypto/constants.js';

const tsBindings = {
  prefixHashes,
  prefixHashesLegacy,
};

// this is put in a global variable so that ../kimchi/js/bindings.js finds it
(globalThis as any).__snarkyTsBindings = tsBindings;
