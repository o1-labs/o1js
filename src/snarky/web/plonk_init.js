import plonkWasm from '../../chrome_bindings/plonk_wasm.js';
import { workerSpec } from './worker_run.js';
import getEfficientNumWorkers from './getEfficientNumWorkers';
import { srcFromFunctionModule, inlineWorker } from './workerHelpers.js';
import snarkyJsChromeSrc from 'string:../../chrome_bindings/snarky_js_chrome.bc.js';
let wasm = plonkWasm();
let init = wasm.default;

export async function initSnarkyJS() {
  let { memory } = await init();
  let module = init.__wbindgen_wasm_module;
  let numWorkers = await getEfficientNumWorkers();

  let worker = inlineWorker(srcFromFunctionModule(mainWorker));
  worker.postMessage({ type: 'init', memory, module, numWorkers });

  let workersReady = new Promise((resolve) => (worker.onmessage = resolve));
  await workersReady;
  globalThis.plonk_wasm = overrideBindings(wasm, worker);

  // we have two approaches to run the .bc.js code after its dependencies are ready, without fetching an additional script:

  // 1. wrap it inside a function and just include that function in the bundle
  // this could be nice and simple, but breaks because the .bc.js code uses `(function(){return this}())` to access `window`
  // (probably as a cross-platform way to get the global object before globalThis existed)
  // that obsolete hack doesn't work here because inside an ES module, this === undefined instead of this === window
  // it seems to work when we patch the source code (replace IIFEs with `window`)

  // 2. include the code as string and eval it:
  // (this works because it breaks out of strict mode)
  new Function(snarkyJsChromeSrc)();
}

async function mainWorker() {
  let wasm = plonkWasm();
  let init = wasm.default;

  let worker_spec = workerSpec(wasm);
  let messageReceived;
  let message = new Promise((resolve) => {
    messageReceived = resolve;
  });
  self.onmessage = function (msg) {
    if (msg.data.type === 'init') {
      messageReceived(msg);
    } else if (msg.data.type === 'run') {
      let spec = worker_spec[msg.data.name];
      let spec_args = spec.args;
      let args = msg.data.args;
      let res_args = args;
      for (let i = 0, l = spec_args.length; i < l; i++) {
        let spec_arg = spec_args[i];
        if (spec_arg && spec_arg.__wrap) {
          // Class info got lost on transfer, rebuild it.
          res_args[i] = spec_arg.__wrap(args[i].ptr);
        } else {
          res_args[i] = args[i];
        }
      }
      let res = wasm[msg.data.name].apply(wasm, res_args);
      if (spec.res && spec.res.__wrap) {
        res = res.ptr;
      } else if (spec.res && spec.res.there) {
        res = spec.res.there(res);
      }
      /* Here be undefined behavior dragons. */
      wasm.set_u32_ptr(msg.data.u32_ptr, res);
      /*postMessage(res);*/
    }
  };

  message = await message;
  await init(message.data.module, message.data.memory);
  await wasm.initThreadPool(message.data.numWorkers);
  postMessage({ type: 'workers_ready' });
}
mainWorker.deps = [plonkWasm, workerSpec];

function overrideBindings(wasm, worker) {
  let spec = workerSpec(wasm);
  let plonk_wasm_ = { ...wasm };
  for (let key in spec) {
    plonk_wasm_[key] = (...args) => {
      let u32_ptr = wasm.create_zero_u32_ptr();
      worker.postMessage({ type: 'run', name: key, args, u32_ptr });
      /* Here be undefined behavior dragons. */
      let res = wasm.wait_until_non_zero(u32_ptr);
      wasm.free_u32_ptr(u32_ptr);
      let res_spec = spec[key].res;
      if (res_spec && res_spec.__wrap) {
        return spec[key].res.__wrap(res);
      } else if (res_spec && res_spec.back) {
        return res_spec.back(res);
      } else {
        return res;
      }
    };
  }
  return plonk_wasm_;
}
