// give browser time to prefetch so we don't include that in the timing
await new Promise((resolve) => setTimeout(resolve, 100));

let start = performance.now();
let { initializeBindings } = await import('o1js');
let time = performance.now() - start;

console.log(`import o1js: ${time.toFixed(0)}ms`);

start = performance.now();
await initializeBindings();
time = performance.now() - start;

console.log(`initialize bindings: ${time.toFixed(0)}ms`);
