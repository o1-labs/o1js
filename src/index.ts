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

export * from './snarky';
export * from './lib/signature';
export * from './lib/circuit_value';
export * from './lib/merkle_proof';
import * as Snarky from './snarky';
import * as Foo from './examples/wip';

(async () => {
  console.log('a');
  await Snarky.isReady.catch((e) => console.log(e));
  await Foo.main().catch((e) => console.log('boo', e));
  console.log('b');
  Snarky.shutdown();
})().catch((e) => console.log(e));
