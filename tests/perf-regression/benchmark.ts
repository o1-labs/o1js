import { ZkProgram } from 'o1js';

export { BenchmarkStorage, benchmark };

let timingStack: [string, number][] = [];

function tic(label: string) {
  console.log(`${label}... `);
  timingStack.push([label, performance.now()]);
}

function toc() {
  let [label, start] = timingStack.pop()!;
  let time = (performance.now() - start) / 1000;
  console.log(`${label}... ${time.toFixed(3)} sec`);
  return { label, start };
}

function BenchmarkStorage() {
  return {
    filePath: 'benchmark-storage.json',
    data: {},
    store: async function () {
      console.log('Storing benchmark data to', this.filePath);
    },
    compare: async function () {
      console.log('Comparing benchmark data...');
      console.log('Comparison complete');
    },
    load: async function (path: string) {
      console.log('Loading benchmark data from', path);
      this.data = { example: 'data' };
      console.log('Data loaded:', this.data);
    },
  };
}

type BenchmarkStorage = {
  filePath: string;
  data: any;
  store: () => Promise<void>;
  compare: () => Promise<void>;
  load: (path: string) => Promise<void>;
};

async function benchmark<
  C extends {
    publicInput?: any;
    publicOutput?: any;
    methods: {
      [I in string]: {
        privateInputs: any;
        auxiliaryOutput?: any;
      };
    };
  }
>(
  program: ReturnType<typeof ZkProgram<C>>,
  BenchmarkStorage: BenchmarkStorage,
  callback: (zkProgram: ReturnType<typeof ZkProgram<C>>, ctx: any) => Promise<void>
): Promise<BenchmarkStorage> {
  console.log('Program name:', program.name);

  let ctx = {
    tic,
    toc: () => {
      let { label, start } = toc();
      BenchmarkStorage.data[label] = {
        time: (performance.now() - start) / 1000,
        label,
      };
      console.log(`Stored timing for ${label}`);
    },
  };
  await callback(program, ctx);
  console.log('Benchmarking complete');
  return BenchmarkStorage;
}
