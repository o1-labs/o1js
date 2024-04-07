/**
 * Helper for printing timings, in the spirit of Python's `tic` and `toc`.
 */

export { tic, toc };

let timingStack: [string | undefined, number][] = [];

function tic(label?: string) {
  if (label) console.log(`${label}... `);
  timingStack.push([label, performance.now()]);
}

function toc() {
  let [label, start] = timingStack.pop()!;
  let time = (performance.now() - start) / 1000;
  if (label) console.log(`${label}... ${time.toFixed(3)} sec`);
  return time;
}
