export const worker_spec = function (plonk_wasm) {
    var bool = {
        "there": function (bool) {
            // We avoid returning zero for false to ensure that the
            // wait_until_non_zero call below terminates.
            if (bool) {
                return 2;
            } else {
                return 1;
            }
        },
        "back": function (u32) {
            return u32 !== 1;
        },
    };
    return {
        "caml_pasta_fp_plonk_index_create":
            { args:
                [ plonk_wasm.WasmPastaFpPlonkGateVector
                , undefined /* number */
                , plonk_wasm.WasmPastaFpUrs ]
            , res: plonk_wasm.WasmPastaFpPlonkIndex },
        "caml_pasta_fq_plonk_index_create":
            { args:
                [ plonk_wasm.WasmPastaFqPlonkGateVector
                , undefined /* number */
                , plonk_wasm.WasmPastaFqUrs ]
            , res: plonk_wasm.WasmPastaFqPlonkIndex },
        "caml_pasta_fp_plonk_verifier_index_create":
            { args:
                [ plonk_wasm.WasmPastaFpPlonkIndex ]
            , res: plonk_wasm.WasmPastaFpPlonkVerifierIndex },
        "caml_pasta_fq_plonk_verifier_index_create":
            { args:
                [ plonk_wasm.WasmPastaFqPlonkIndex ]
            , res: plonk_wasm.WasmPastaFqPlonkVerifierIndex },
        "caml_pasta_fp_plonk_proof_create":
            { args:
                [ plonk_wasm.WasmPastaFpPlonkIndex
                , undefined /*Uint8Array*/
                , undefined /*Uint8Array*/
                , undefined /*Uint8Array*/
                , undefined /*Uint32Array*/ ]
            , res: plonk_wasm.WasmPastaFpProverProof },
        "caml_pasta_fq_plonk_proof_create":
            { args:
                [ plonk_wasm.WasmPastaFqPlonkIndex
                , undefined /*Uint8Array*/
                , undefined /*Uint8Array*/
                , undefined /*Uint8Array*/
                , undefined /*Uint32Array*/ ]
            , res: plonk_wasm.WasmPastaFqProverProof },
        "caml_pasta_fp_plonk_proof_verify":
            { args:
                [ undefined /*Uint32Array*/
                , plonk_wasm.WasmPastaFpPlonkVerifierIndex
                , plonk_wasm.WasmPastaFpProverProof ]
            , res: bool },
        "caml_pasta_fq_plonk_proof_verify":
            { args:
                [ undefined /*Uint32Array*/
                , plonk_wasm.WasmPastaFqPlonkVerifierIndex
                , plonk_wasm.WasmPastaFqProverProof ]
            , res: bool }
    };
};

export const override_bindings = function(plonk_wasm, worker) {
    var worker_spec_ = worker_spec(plonk_wasm);
    // Copied object so that we don't modify any const bindings.
    var plonk_wasm_ = {};
    for (var i in plonk_wasm) {
        plonk_wasm_[i] = plonk_wasm[i];
    }
    for (var i in worker_spec_) {
        plonk_wasm_[i] = (function(i) {
            return function() {
                console.log("Running a binding in the worker", i);
                var old_onmessage = worker.onmessage;
                var u32_ptr = plonk_wasm.create_zero_u32_ptr();
                var args = Array.prototype.slice.apply(arguments);
                worker.postMessage({"type": "run", name: i, args: args, u32_ptr: u32_ptr});
                console.log("You spin me right round, baby");
                /* Here be undefined behavior dragons. */
                var res = plonk_wasm.wait_until_non_zero(u32_ptr);
                console.log("Round round");
                plonk_wasm.free_u32_ptr(u32_ptr);
                worker.onmessage = old_onmessage;
                var res_spec = worker_spec_[i].res;
                if (res_spec && res_spec.__wrap) {
                    return worker_spec_[i].res.__wrap(res);
                } else if (res_spec && res_spec.back) {
                    return res_spec.back(res);
                } else {
                    return res;
                }
            };
        })(i);
    }
    return plonk_wasm_;
}
