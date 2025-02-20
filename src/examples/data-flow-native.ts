import { OCamlobject, initializeBindings, Field } from 'o1js';

await initializeBindings();

let nativeRustValue = OCamlobject.runMeRust();
console.log(nativeRustValue);

OCamlobject.runMe();

const input = [Field(1), Field(2), Field(3)];
nativeRustValue = OCamlobject.runPoseidonCipherNative(input);
console.log(nativeRustValue);
