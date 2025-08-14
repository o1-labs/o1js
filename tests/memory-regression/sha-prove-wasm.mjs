// tests/memory-regression/sha-prove-wasm.mjs
// Goal: force wasm backend in Node and get real wasm bytes/pages per phase.

// ----------------- Patch WebAssembly.* FIRST -----------------
const OriginalMemory = WebAssembly.Memory;
let totalWasmBytes = 0,
  totalWasmPages = 0;

// Track any Memory instances we discover (constructor or instantiate*)
const seenMems = new Set();
function updateWasmStats(mem) {
  totalWasmBytes = Math.max(totalWasmBytes, mem.buffer.byteLength);
  totalWasmPages = Math.max(totalWasmPages, mem.buffer.byteLength / 65536);
}
function trackMemory(mem) {
  if (!(mem instanceof WebAssembly.Memory) || seenMems.has(mem)) return;
  seenMems.add(mem);
  updateWasmStats(mem);

  // Count future JS-initiated grows
  const g = mem.grow?.bind(mem);
  if (g) {
    mem.grow = (delta) => {
      const r = g(delta);
      updateWasmStats(mem);
      return r;
    };
  }
  // Poll because engines can grow internally without calling .grow()
  const iv = setInterval(() => {
    if (!seenMems.has(mem)) return clearInterval(iv);
    updateWasmStats(mem);
  }, 100);
}

// Replace constructor so direct `new WebAssembly.Memory(...)` is tracked
WebAssembly.Memory = class MemProxy extends OriginalMemory {
  constructor(opts, ...rest) {
    super(opts, ...rest);
    trackMemory(this);
  }
};

// Hook instantiate & instantiateStreaming to capture exported memories
const _instantiate = WebAssembly.instantiate;
WebAssembly.instantiate = async function (source, imports) {
  const res = await _instantiate.call(WebAssembly, source, imports);
  const inst = res.instance ?? res;
  if (inst?.exports?.memory instanceof WebAssembly.Memory) trackMemory(inst.exports.memory);
  return res;
};
const _instantiateStreaming = WebAssembly.instantiateStreaming;
if (_instantiateStreaming) {
  WebAssembly.instantiateStreaming = async function (response, imports) {
    const res = await _instantiateStreaming.call(WebAssembly, response, imports);
    const inst = res.instance ?? res;
    if (inst?.exports?.memory instanceof WebAssembly.Memory) trackMemory(inst.exports.memory);
    return res;
  };
}

// ----------------- Force-load the wasm binding (plonk-wasm.cjs) -----------------
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findPlonkWasmBinding() {
  const candidates = [];

  // If running from dist/node/tests/..., hop to dist/node/bindings/compiled/_node_bindings
  const distSeg = `${path.sep}dist${path.sep}node${path.sep}`;
  const idx = __dirname.lastIndexOf(distSeg);
  if (idx !== -1) {
    const base = path.join(
      __dirname.slice(0, idx),
      'dist',
      'node',
      'bindings',
      'compiled',
      '_node_bindings'
    );
    candidates.push(
      path.join(base, 'plonk-wasm.cjs'),
      path.join(base, 'plon-wasm.cjs'), // alternate naming just in case
      path.join(base, 'plonk_wasm.cjs')
    );
  }
  // Fallback: from repo root guess
  candidates.push(
    path.resolve(__dirname, '../../dist/node/bindings/compiled/_node_bindings/plonk-wasm.cjs')
  );

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const wasmBindingPath = findPlonkWasmBinding();
if (wasmBindingPath) {
  // Redirect resolution of any native *.bc.cjs binding to plonk-wasm.cjs
  const _resolveFilename = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    const resolved = _resolveFilename.call(this, request, parent, isMain, options);
    if (
      typeof resolved === 'string' &&
      resolved.includes(`${path.sep}_node_bindings${path.sep}`) &&
      resolved.endsWith('.bc.cjs')
    ) {
      return wasmBindingPath;
    }
    return resolved;
  };
  // Optional visibility: print a JSON info line your runner can ignore
  console.log(JSON.stringify({ info: { wasm_binding_forced: true, path: wasmBindingPath } }));
} else {
  console.log(
    JSON.stringify({
      info: { wasm_binding_forced: false, reason: 'plonk-wasm.cjs not found (did you build?)' },
    })
  );
}

// ----------------- Sampling helper (same shape you already use) -----------------
function sample(label) {
  const m = process.memoryUsage();
  console.log(
    JSON.stringify({
      label,
      mem: {
        rss: m.rss,
        heapUsed: m.heapUsed,
        heapTotal: m.heapTotal,
        external: m.external,
        arrayBuffers: m.arrayBuffers ?? 0,
      },
      wasm: { bytes: totalWasmBytes, pages: totalWasmPages },
    })
  );
}

// ----------------- Your workload (unchanged) -----------------
async function run() {
  const { Bytes, Gadgets, ZkProgram } = await import('o1js');

  // Build a SHA-256 program (publicOutput = 32 bytes digest)
  const Digest = class extends Bytes(32) {};
  const LEN = Number(process.env.O1JS_SHA_LEN ?? 256);
  const Preimage = class extends Bytes(LEN) {};

  const SHA256Program = ZkProgram({
    name: 'SHA256Program',
    publicOutput: Digest,
    methods: {
      hash: {
        privateInputs: [Preimage],
        method(preimage) {
          const digest = Gadgets.SHA256.hash(preimage);
          return { publicOutput: digest };
        },
      },
    },
  });

  // deterministic input (random is OK too—use fromString for reproducibility)
  const text = (process.env.O1JS_SHA_TEXT ?? 'o1js-memory-bench').padEnd(LEN, 'x').slice(0, LEN);
  const preimage = Preimage.fromString ? Preimage.fromString(text) : Preimage.random();

  // Baseline → compile → prove → post-GC  (you can wrap with timers if needed)
  sample('baseline');
  await SHA256Program.compile();
  sample('after-compile');
  const proof = await SHA256Program.hash(preimage);
  void proof;
  sample('after-prove');
  global.gc?.();
  sample('post-gc');
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
