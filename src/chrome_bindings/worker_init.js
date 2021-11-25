import plonkWasm from './plonk_wasm.js';
import workerRun from './worker_run.js';

export { workerInit as default };

async function workerInit() {
  let plonk_wasm = plonkWasm();
  let init = plonk_wasm.default;
  let worker_run = workerRun();

  let worker_spec = worker_run.worker_spec(plonk_wasm);
  let messageReceived;
  let message = new Promise((resolve) => {
    messageReceived = resolve;
  });
  self.onmessage = function (msg) {
    if (msg.data.type == 'init') {
      messageReceived(msg);
    } else if (msg.data.type == 'run') {
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
      let res = plonk_wasm[msg.data.name].apply(plonk_wasm, res_args);
      if (spec.res && spec.res.__wrap) {
        res = res.ptr;
      } else if (spec.res && spec.res.there) {
        res = spec.res.there(res);
      }
      /* Here be undefined behavior dragons. */
      plonk_wasm.set_u32_ptr(msg.data.u32_ptr, res);
      /*postMessage(res);*/
    }
  };

  message = await message;
  await init(message.data.module, message.data.memory);
  await plonk_wasm.initThreadPool(navigator.hardwareConcurrency);
  postMessage({ type: 'wasm_bindgen_rayon_threads_ready' });
}
workerInit.deps = [plonkWasm, workerRun];
