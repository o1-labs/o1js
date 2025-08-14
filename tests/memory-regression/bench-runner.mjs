// node bench-runner.mjs scenario.mjs
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const scenario = process.argv[2];
if (!scenario) {
  console.error('Usage: node bench-runner.mjs <scenario.mjs>');
  process.exit(1);
}

// Use --expose-gc so the scenario can force GC at checkpoints if desired.
// Avoid --trace-gc in benchmarks (it adds noise).
const child = spawn(
  process.execPath,
  [
    '--expose-gc',
    '--max-old-space-size=8192', // keep stable across runs
    scenario,
  ],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_OPTIONS: '' },
  }
);

let peak = {
  rss: 0,
  heapUsed: 0,
  heapTotal: 0,
  external: 0,
  arrayBuffers: 0,
  wasmBytes: 0, // reported by scenario
  wasmPages: 0,
};

child.stdout.on('data', (buf) => {
  // The scenario periodically prints JSON lines like: {"mem":{...}}
  const lines = buf.toString('utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.mem) {
        const m = obj.mem;
        peak.rss = Math.max(peak.rss, m.rss ?? 0);
        peak.heapUsed = Math.max(peak.heapUsed, m.heapUsed ?? 0);
        peak.heapTotal = Math.max(peak.heapTotal, m.heapTotal ?? 0);
        peak.external = Math.max(peak.external, m.external ?? 0);
        peak.arrayBuffers = Math.max(peak.arrayBuffers, m.arrayBuffers ?? 0);
      }
      if (obj.wasm) {
        peak.wasmBytes = Math.max(peak.wasmBytes, obj.wasm.bytes ?? 0);
        peak.wasmPages = Math.max(peak.wasmPages, obj.wasm.pages ?? 0);
      }
    } catch {}
  }
});

child.stderr.on('data', (buf) => process.stderr.write(buf));
const [code] = await once(child, 'close');

const row = {
  scenario,
  peak_rss_mb: (peak.rss / (1024 * 1024)).toFixed(1),
  peak_heap_used_mb: (peak.heapUsed / (1024 * 1024)).toFixed(1),
  peak_heap_total_mb: (peak.heapTotal / (1024 * 1024)).toFixed(1),
  peak_external_mb: (peak.external / (1024 * 1024)).toFixed(1),
  peak_arraybuffers_mb: (peak.arrayBuffers / (1024 * 1024)).toFixed(1),
  peak_wasm_mb: (peak.wasmBytes / (1024 * 1024)).toFixed(1),
  peak_wasm_pages: peak.wasmPages,
  exit_code: code,
};

console.log(JSON.stringify({ result: row }, null, 2));
process.exit(code ?? 0);
