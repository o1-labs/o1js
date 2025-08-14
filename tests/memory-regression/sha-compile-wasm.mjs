// tests/memory-regression/sha-compile-wasm.mjs

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

  // Count JS-initiated grows
  const g = mem.grow?.bind(mem);
  if (g) {
    mem.grow = (delta) => {
      const r = g(delta);
      updateWasmStats(mem);
      return r;
    };
  }
  // Poll because engines can grow memory internally
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

// ----------------- Force-load the wasm binding (plonk_wasm.cjs) -----------------
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolvePlonkWasmPath() {
  const candidates = [];

  // If we are under dist/node/tests/..., go to repo root and then to the binding path
  const distSeg = `${path.sep}dist${path.sep}node${path.sep}`;
  const idx = __dirname.lastIndexOf(distSeg);
  if (idx !== -1) {
    const root = __dirname.slice(0, idx);
    candidates.push(
      path.join(root, 'dist', 'node', 'bindings', 'compiled', 'node_bindings', 'plonk_wasm.cjs')
    );
  }

  // Common fallback if we’re executing from repo root
  candidates.push(
    path.resolve(__dirname, '../../dist/node/bindings/compiled/node_bindings/plonk_wasm.cjs')
  );

  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}

const wasmBindingPath = resolvePlonkWasmPath();

// Intercept module resolution so when o1js asks for a native binding (…/node_bindings/*.cjs except plonk_wasm.cjs),
// we hand it your wasm binding instead.
if (wasmBindingPath) {
  const _resolveFilename = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    const resolved = _resolveFilename.call(this, request, parent, isMain, options);
    if (
      typeof resolved === 'string' &&
      resolved.includes(
        `${path.sep}bindings${path.sep}compiled${path.sep}node_bindings${path.sep}`
      ) &&
      resolved.endsWith('.cjs') &&
      !resolved.endsWith('plonk_wasm.cjs')
    ) {
      return wasmBindingPath;
    }
    return resolved;
  };
  console.log(JSON.stringify({ info: { wasm_binding_forced: true, path: wasmBindingPath } }));
} else {
  console.log(
    JSON.stringify({
      info: {
        wasm_binding_forced: false,
        reason:
          'dist/node/bindings/compiled/node_bindings/plonk_wasm.cjs not found (did you build?)',
      },
    })
  );
}

// ----------------- Sampler (same shape as your other scenarios) -----------------
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

// ----------------- Workload: compile-only -----------------
async function run() {
  const { Bytes, Gadgets, ZkProgram } = await import('o1js');

  // Build a SHA-256 program
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

  // Compile-only timeline
  sample('baseline');
  const pages0 = totalWasmPages;
  await SHA256Program.compile();
  sample('after-compile');
  console.log(JSON.stringify({ info: { wasm_pages_delta_compile: totalWasmPages - pages0 } }));

  global.gc?.();
  sample('post-gc');
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
