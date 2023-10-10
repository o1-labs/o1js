import {
  Field,
  Circuit,
  circuitMain,
  public_,
  UInt64,
  Experimental,
} from 'o1js';

let { ZkProgram } = Experimental;

const Main = ZkProgram({
  publicInput: Field,
  methods: {
    main: {
      privateInputs: [UInt64],
      method(y: Field, x: UInt64) {
        let y3 = y.square().mul(y);
        y3.assertEquals(x.value);
      },
    },
  },
});

console.log('generating keypair...');
console.time('generating keypair...');
const kp = await Main.compile();
console.timeEnd('generating keypair...');

console.log('prove...');
console.time('prove...');
const x = UInt64.from(8);
const y = new Field(2);
const proof = await Main.main(y, x);
console.timeEnd('prove...');

console.log('verify...');
console.time('verify...');
let ok = await Main.verify(proof);
console.timeEnd('verify...');

console.log('ok?', ok);
