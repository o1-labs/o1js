import { OCamlobject, initializeBindings } from 'o1js';

await initializeBindings();

let nativeRustValue = OCamlobject.runMeRust();
console.log(nativeRustValue);

OCamlobject.runMe();

nativeRustValue = OCamlobject.runPoseidonCipherNative([1, 2, 3]);
console.log(nativeRustValue);
