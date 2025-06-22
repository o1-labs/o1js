import { MyProgram } from '../../src/examples/zkprogram/program.js';
import { benchmark, BenchmarkStorage } from './benchmark.js';

const benchmarkConfig = BenchmarkStorage();

let benchData = await benchmark(MyProgram, benchmarkConfig, async (p, ctx) => {
  ctx.tic('compile');
  await p.compile();
  ctx.toc();

  ctx.tic('prove');
  let proof = await p.baseCase();
  ctx.toc();
});

console.log('Benchmark data:', benchData);

await benchData.store();
await benchData.compare();
