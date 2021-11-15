import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';

// run typescript
let entry = process.argv[2] ?? './src/index.ts';
let json = JSON.stringify({
  extends: './tsconfig.json',
  include: [entry],
  compilerOptions: {
    outDir: 'dist/web-esbuild',
  },
});
await fs.promises.writeFile('./tsconfig.web-tmp.json', json);
await execPromise('npx tsc -p tsconfig.web-tmp.json');
await execPromise('rm ./tsconfig.web-tmp.json');

// copy over pure js files
copy({
  './src/snarky.js': './dist/web-esbuild/snarky.js',
  './src/chrome_bindings': './dist/web-esbuild/chrome_bindings/',
});

// run esbuild on the js tree
let jsEntry = path.basename(entry).replace('.ts', '.js');
await esbuild.build({
  entryPoints: [`./dist/web-esbuild/${jsEntry}`],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  outfile: 'dist/web-esbuild/index.js',
  resolveExtensions: ['.js', '.ts'],
  plugins: [],
  external: ['*.bc.js'],
  target: 'esnext',
  allowOverwrite: true,
});

copy({
  './src/chrome_bindings': './dist/web-esbuild/',
});

function copy(copyMap) {
  for (let [source, target] of Object.entries(copyMap)) {
    fs.cpSync(source, target, {
      recursive: true,
      force: true,
      dereference: true,
    });
  }
}

function execPromise(cmd) {
  return new Promise((r) =>
    exec(cmd, (_, stdout) => {
      r(stdout);
    })
  );
}
