let start = performance.now();
await import('o1js');
let time = performance.now() - start;

console.log(`import jsoo: ${time.toFixed(0)}ms`);
