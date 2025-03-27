import { Snarky, Field, initializeBindings } from 'o1js';

await initializeBindings();

let res = Snarky.run.poseidonBlockCipher([Field.from(21)]);
console.log(res);
