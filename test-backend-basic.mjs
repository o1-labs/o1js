import { Field, getCurrentBackend } from './dist/node/index.js';

console.log('Backend:', getCurrentBackend());
console.log('Field test:', Field(42).toString());
console.log('Basic functionality working ✅');