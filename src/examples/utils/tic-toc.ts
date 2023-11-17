/**
 * Helper for printing timings, in the spirit of Python's `tic` and `toc`.
 */

export { tic, toc };

let timingStack: [string, number][] = [];
let i = 0;

function tic(label = `Run command ${i++}`) {
  console.log(`${label}... `);
  timingStack.push([label, performance.now()]);
}

function toc() {
  let [label, start] = timingStack.pop()!;
  let time = (performance.now() - start) / 1000;
  console.log(`\r${label}... ${time.toFixed(3)} sec\n`);
  return time;
}
