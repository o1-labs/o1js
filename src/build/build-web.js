import esbuild from 'esbuild';
import fse, { move } from 'fs-extra';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import glob from 'glob';

export { buildWeb };

const entry = './src/index.ts';
const target = 'es2022';

let nodePath = path.resolve(process.argv[1]);
let modulePath = path.resolve(fileURLToPath(import.meta.url));
let isMain = nodePath === modulePath;

if (isMain) {
  console.log('building', entry);
  await buildWeb({ production: process.env.NODE_ENV === 'production' });
  console.log('finished build');
}

async function buildWeb({ production }) {
  let minify = !!production;

  // prepare plonk_wasm.js with bundled wasm in function-wrapped form
  let bindings = await readFile(
    './src/bindings/compiled/web_bindings/plonk_wasm.js',
    'utf8'
  );
  bindings = rewriteWasmBindings(bindings);
  let tmpBindingsPath = 'src/bindings/compiled/web_bindings/plonk_wasm.tmp.js';
  await writeFile(tmpBindingsPath, bindings);
  await esbuild.build({
    entryPoints: [tmpBindingsPath],
    bundle: true,
    format: 'esm',
    outfile: tmpBindingsPath,
    target: 'esnext',
    plugins: [wasmPlugin()],
    allowOverwrite: true,
  });
  bindings = await readFile(tmpBindingsPath, 'utf8');
  bindings = rewriteBundledWasmBindings(bindings);
  await writeFile(tmpBindingsPath, bindings);

  // run typescript
  await execPromise('npx tsc -p tsconfig.web.json');

  // copy over pure js files
  await copy({
    './src/bindings/compiled/web_bindings/': './dist/web/web_bindings/',
    './src/snarky.d.ts': './dist/web/snarky.d.ts',
    './src/snarky.web.js': './dist/web/snarky.js',
    './src/bindings/js/web/': './dist/web/bindings/js/web/',
  });

  if (minify) {
    let o1jsWebPath = './dist/web/web_bindings/o1js_web.bc.js';
    let o1jsWeb = await readFile(o1jsWebPath, 'utf8');
    let { code } = await esbuild.transform(o1jsWeb, {
      target,
      logLevel: 'error',
      minify,
    });
    await writeFile(o1jsWebPath, code);
  }

  // overwrite plonk_wasm with bundled version
  await copy({ [tmpBindingsPath]: './dist/web/web_bindings/plonk_wasm.js' });
  await unlink(tmpBindingsPath);

  // move all .web.js files to their .js counterparts
  let webFiles = glob.sync('./dist/web/**/*.web.js');
  await Promise.all(
    webFiles.map((file) =>
      move(file, file.replace('.web.js', '.js'), { overwrite: true })
    )
  );

  // run esbuild on the js entrypoint
  let jsEntry = path.basename(entry).replace('.ts', '.js');
  await esbuild.build({
    entryPoints: [`./dist/web/${jsEntry}`],
    bundle: true,
    format: 'esm',
    outfile: 'dist/web/index.js',
    resolveExtensions: ['.js', '.ts'],
    plugins: [wasmPlugin(), srcStringPlugin()],
    dropLabels: ['CJS'],
    external: ['*.bc.js'],
    target,
    allowOverwrite: true,
    logLevel: 'error',
    minify,
  });
}

async function copy(copyMap) {
  let promises = [];
  for (let [source, target] of Object.entries(copyMap)) {
    promises.push(
      fse.copy(source, target, {
        recursive: true,
        overwrite: true,
        dereference: true,
      })
    );
  }
  await Promise.all(promises);
}

function execPromise(cmd) {
  return new Promise((res, rej) =>
    exec(cmd, (err, stdout) => {
      if (err) {
        console.log(stdout);
        return rej(err);
      }
      res(stdout);
    })
  );
}

function rewriteWasmBindings(src) {
  src = src
    .replace("new URL('plonk_wasm_bg.wasm', import.meta.url)", 'wasmCode')
    .replace('import.meta.url', '"/"');
  return `import wasmCode from './plonk_wasm_bg.wasm';
  let startWorkers, terminateWorkers;  
${src}`;
}
function rewriteBundledWasmBindings(src) {
  let i = src.indexOf('export {');
  let exportSlice = src.slice(i);
  let defaultExport = exportSlice.match(/\w* as default/)[0];
  exportSlice = exportSlice
    .replace(defaultExport, `default: __wbg_init`)
    .replace('export', 'return');
  src = src.slice(0, i) + exportSlice;

  src = src.replace('var startWorkers;\n', '');
  src = src.replace('var terminateWorkers;\n', '');
  return `import { startWorkers, terminateWorkers } from '../bindings/js/web/worker-helpers.js'
export {plonkWasm as default};
function plonkWasm() {
  ${src}
}
plonkWasm.deps = [startWorkers, terminateWorkers]`;
}

function wasmPlugin() {
  return {
    name: 'wasm-plugin',
    setup(build) {
      build.onLoad({ filter: /\.wasm$/ }, async ({ path }) => {
        return {
          contents: await readFile(path),
          loader: 'binary',
        };
      });
    },
  };
}

function srcStringPlugin() {
  return {
    name: 'src-string-plugin',
    setup(build) {
      build.onResolve(
        { filter: /^string:/ },
        async ({ path: importPath, resolveDir }) => {
          let absPath = path.resolve(
            resolveDir,
            importPath.replace('string:', '')
          );
          return {
            path: absPath,
            namespace: 'src-string',
          };
        }
      );

      build.onLoad(
        { filter: /.*/, namespace: 'src-string' },
        async ({ path }) => {
          return {
            contents: await readFile(path, 'utf8'),
            loader: 'text',
          };
        }
      );
    },
  };
}

function deferExecutionPlugin() {
  return {
    name: 'defer-execution-plugin',
    setup(build) {
      build.onResolve(
        { filter: /^defer:/ },
        async ({ path: importPath, resolveDir }) => {
          let absPath = path.resolve(
            resolveDir,
            importPath.replace('defer:', '')
          );
          return {
            path: absPath,
            namespace: 'defer-execution',
          };
        }
      );

      build.onLoad(
        { filter: /.*/, namespace: 'defer-execution' },
        async ({ path }) => {
          let code = await readFile(path, 'utf8');
          // replace direct eval, because esbuild refuses to bundle it
          // code = code.replace(/eval\(/g, '(0, eval)(');
          code = code.replace(
            /function\(\)\s*\{\s*return this\s*\}\(\)/g,
            'window'
          );
          code = code.replace(
            /function\(\)\s*\{\s*return this;\s*\}\(\)/g,
            'window'
          );
          let deferedCode = `
          let require = () => {};
          export default () => {\n${code}\n};`;
          return {
            contents: deferedCode,
            loader: 'js',
          };
        }
      );
    },
  };
}
