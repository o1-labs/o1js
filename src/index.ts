
/*
function foo(x: number) {

return function (this: any, target: any, key: string) {
    console.log('is A', target.constructor === A);
    console.log('thnis', target.bar());
    console.log('t', target);
    Object.defineProperty(target, key, { set: (x) => { console.log('setter')}, get: () => 'correct'})
}
}
abstract class B {
    _bar: string | undefined;
    address: string;
    constructor(address: string) {
      this.address = address;
      this.bar();
    }

    bar() : string {

        if (this._bar !== undefined) { return this._bar }
console.log('only once')
        this._bar = 'super';
        return this._bar;
    }
}


class A extends B  {
    @foo(10)
    x: string;

    constructor() {
       super('ptotat')
       this.x = 'wrong';
    }
}
const a = new A();

console.log(a.x) */


export * from './snarky'; // TODO: do we want to expose this really?
export * as Signature from './lib/signature';
export * as CircuitValue from './lib/circuit_value';
export * as Snapp from './lib/snapp';
export * as Int from './lib/int';
export * as MerkleProof from './lib/merkle_proof';
export * as ProofSystem from './lib/proof_system';
export * as Internal from './lib/party';
export * as MerkleStack from './lib/merkle_stack';
export * as Mina from './lib/mina';

import * as Snarky from './snarky';
//import * as Foo from './examples/wip';
import * as Foo from '../examples/tictactoe';

(async () => {
    console.log('a');
    await Snarky.isReady.catch((e) => console.log(e));
    await Foo.main();
    console.log('b');
    Snarky.shutdown()
})().catch((e) => console.log(e));
