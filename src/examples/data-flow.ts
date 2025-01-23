import { OCamlobject, initializeBindings } from 'o1js';

await initializeBindings();

let rustValue = OCamlobject.runMeRust();
console.log(rustValue);

OCamlobject.runMe();
