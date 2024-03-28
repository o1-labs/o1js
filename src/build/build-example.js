import fs from 'fs/promises';
import path from 'path';
import ts from 'typescript';
import esbuild from 'esbuild';
import { platform } from 'node:process';

export { buildAndImport, build, buildOne };

async function buildAndImport(srcPath, { keepFile = false }) {
  let absPath = await build(srcPath);
  let importedModule;
  try {
    importedModule = await import(absPath);
  } finally {
    if (!keepFile) await fs.unlink(absPath.replace(/^file:\/\/\/*/, ''));
  }
  return importedModule;
}

async function build(srcPath, isWeb = false) {
  let tsConfig = findTsConfig() ?? defaultTsConfig;
  // TODO hack because ts.transpileModule doesn't treat module = 'nodenext' correctly
  // but `tsc` demands it to be `nodenext`
  tsConfig.compilerOptions.module = 'esnext';

  let outfile = srcPath.replace('.ts', '.tmp.js');

  await esbuild.build({
    entryPoints: [srcPath],
    bundle: true,
    format: 'esm',
    platform: isWeb ? 'node' : 'browser',
    outfile,
    target: 'esnext',
    resolveExtensions: ['.node.js', '.ts', '.js'],
    logLevel: 'error',
    plugins: isWeb
      ? [typescriptPlugin(tsConfig), makeO1jsExternal()]
      : [
          typescriptPlugin(tsConfig),
          makeNodeModulesExternal(),
          makeJsooExternal(),
        ],
    dropLabels: ['CJS'],
  });

  let absPath = path.resolve('.', outfile);
  if (platform === 'win32') {
    absPath = 'file:///' + absPath;
  }
  return absPath;
}

async function buildOne(srcPath) {
  let tsConfig = findTsConfig() ?? defaultTsConfig;
  // TODO hack because ts.transpileModule doesn't treat module = 'nodenext' correctly
  // but `tsc` demands it to be `nodenext`
  tsConfig.compilerOptions.module = 'esnext';

  let outfile = path.resolve(
    './dist/node',
    srcPath.replace('.ts', '.js').replace('src', '.')
  );

  await esbuild.build({
    entryPoints: [srcPath],
    format: 'esm',
    platform: 'node',
    outfile,
    target: 'esnext',
    resolveExtensions: ['.node.js', '.ts', '.js'],
    logLevel: 'error',
    plugins: [typescriptPlugin(tsConfig)],
  });

  let absPath = path.resolve('.', outfile);
  if (platform === 'win32') {
    absPath = 'file:///' + absPath;
  }
  return absPath;
}

const defaultTsConfig = {
  compilerOptions: {
    module: 'esnext',
    lib: ['dom', 'esnext'],
    target: 'esnext',
    importHelpers: true,
    strict: true,
    moduleResolution: 'nodenext',
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    allowSyntheticDefaultImports: true,
  },
};

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
  let isNodeModule = /^[^./\\]|^\.[^./\\]|^\.\.[^/\\]/;
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: isNodeModule }, ({ path }) => ({
        path,
        external: !(platform === 'win32' && path.endsWith('index.js')),
      }));
    },
  };
}

function makeO1jsExternal() {
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: /^o1js$/ }, () => ({
        path: './index.js',
        external: true,
      }));
    },
  };
}

function makeJsooExternal() {
  let isJsoo = /(bc.cjs|plonk_wasm.cjs)$/;
  return {
    name: 'plugin-external',
    setup(build) {
      build.onResolve({ filter: isJsoo }, ({ path: filePath, resolveDir }) => {
        return {
          path: path.resolve(resolveDir, filePath),
          external: true,
        };
      });
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
