import fs from 'node:fs/promises';

const file = process.argv[2];

let src = await fs.readFile(file, 'utf8');

src = src.replace(
  "imports['env'] = require('env');",
  `
let { isMainThread, workerData } = require('worker_threads');

let env = {};
if (isMainThread) {
  env.memory = new WebAssembly.Memory({
    initial: 20,
    maximum: 65536,
    shared: true,
  });
} else {
  env.memory = workerData.memory;
}

imports['env'] = env;
`
);

await fs.writeFile(file, src, 'utf8');
