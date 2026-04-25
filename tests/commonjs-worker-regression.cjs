/**
 * Regression test for the packaged CommonJS worker entrypoint.
 *
 * The package's CommonJS export resolves to dist/node/index.cjs. Compiling a
 * ZkProgram exercises the Node wasm threadpool and verifies that the worker
 * source starts the backend rather than exiting before rayon is initialized.
 */
const { Cache, Field, ZkProgram } = require('o1js');

const resolvedO1js = require.resolve('o1js').replace(/\\/g, '/');
if (!resolvedO1js.endsWith('/dist/node/index.cjs')) {
  throw new Error(`Expected CommonJS package entrypoint, got ${resolvedO1js}`);
}

const CommonJsWorkerRegression = ZkProgram({
  name: 'commonjs-worker-regression',
  publicOutput: Field,
  methods: {
    baseCase: {
      privateInputs: [],
      async method() {
        return { publicOutput: Field(1) };
      },
    },
  },
});

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  await CommonJsWorkerRegression.compile({ cache: Cache.None, forceRecompile: true });
  console.log('CommonJS worker regression passed.');
}
