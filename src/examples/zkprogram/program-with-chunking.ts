import { Field, Cache, Gadgets, ZkProgram } from 'o1js';
import { Performance } from '../../lib/testing/perf-regression.js';

let MyProgram = ZkProgram({
  chunks: 1,
  overrideWrapDomain: 0,
  name: 'example-with-chunking',
  publicOutput: Field,

  methods: {
    baseCase: {
      privateInputs: [Field],
      async method(input: Field) {
        for (let i = 0; i < 1 << 16; i++) {
          Gadgets.rangeCheck64(Field(input).add(Field(i)));
        }
        // The above generates 2^16+2^15 rows which needs to be split into 2 chunks
        return {
          publicOutput: Field(0),
        };
      },
    },
  },
});

const cs = await MyProgram.analyzeMethods();
const perf = Performance.create(MyProgram.name, cs);

console.log('MyProgram baseCase method rows: ', cs.baseCase.rows);

perf.start('compile');
await MyProgram.compile({ cache: Cache.None });
perf.end();

perf.start('prove', 'baseCase');
let { proof } = await MyProgram.baseCase(Field(0));
perf.end();

console.log('verify...');
let ok = await MyProgram.verify(proof);
console.log('ok?', ok);
