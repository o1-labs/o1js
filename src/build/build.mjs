import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import esbuild from 'esbuild';

let srcPath = './src/build/examples/preimage.ts';

const defaultTsConfig = {
  compilerOptions: {
    module: 'esnext',
    lib: ['dom', 'esnext'],
    target: 'esnext',
    importHelpers: true,
    strict: true,
    moduleResolution: 'node',
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    allowSyntheticDefaultImports: true,
  },
};
let tsConfig = findTsConfig() ?? defaultTsConfig;

let outfile = srcPath.replace('.ts', '.tmp.mjs');

await esbuild.build({
  entryPoints: [srcPath],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  target: 'esnext',
  resolveExtensions: ['.node.js', '.ts', '.js'],
  plugins: [typescriptPlugin(tsConfig), makeNodeModulesExternal()],
});

let absPath = path.resolve('.', outfile);

let Class = (await import(absPath)).default;

await fs.unlink(absPath);

// Uint8Array.prototype.toJSON = function () {
//   return `new Uint8Array(${JSON.stringify([...this])})`;
// };
// console.log(JSON.stringify(new Uint8Array([1, 2, 3, 4])));

let keypair = Class.generateKeypair();
console.dir(keypair, { depth: null });

function typescriptPlugin(tsConfig) {
  return {
    name: 'plugin-typescript',
    setup(build) {
      build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
        let src = await fs.readFile(args.path, { encoding: 'utf8' });
        let { outputText: contents } = ts.transpileModule(src, tsConfig);
        return { contents };
      });
    },
  };
}

function makeNodeModulesExternal() {
  let isNodeModule = /^[^./]|^\.[^./]|^\.\.[^/]/;
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: isNodeModule }, ({ path }) => ({
        path,
        external: true,
      }));
    },
  };
}

function findTsConfig() {
  let tsConfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists);
  if (tsConfigPath === undefined) return;
  let text = ts.sys.readFile(tsConfigPath);
  if (text === undefined) throw new Error(`failed to read '${tsConfigPath}'`);
  return ts.parseConfigFileTextToJson(tsConfigPath, text).config;
}
