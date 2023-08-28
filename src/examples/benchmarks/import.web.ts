let start = performance.now();
await import('snarkyjs');
let time = performance.now() - start;

console.log(`import jsoo: ${time.toFixed(0)}ms`);
