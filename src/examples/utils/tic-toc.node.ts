/**
 * Helper for printing timings, in the spirit of Python's `tic` and `toc`.
 *
 * This is a slightly nicer version of './tic-tic.ts' which only works in Node.
 */

export { tic, toc };

let timingStack: [string, number][] = [];
let i = 0;

function tic(label = `Run command ${i++}`) {
  process.stdout.write(`${label}... `);
  timingStack.push([label, performance.now()]);
}

function toc() {
  let [label, start] = timingStack.pop()!;
  let time = (performance.now() - start) / 1000;
  process.stdout.write(`\r${label}... ${time.toFixed(3)} sec\n`);
}
