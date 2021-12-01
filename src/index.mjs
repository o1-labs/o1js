// this file becomes the entry point for node projects that use ESM imports
import snarky from './index.js';
// here we can just await the promise to provide a cleaner interface
await snarky.isReady;

let { __EXPORTS__ } = snarky;
export { __EXPORTS__ };
