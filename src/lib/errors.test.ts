import { prettifyStacktrace } from 'snarkyjs';

const outsideCircuitStackTrace = `
/workspace_root/src/lib/snarkyjs/src/bindings/ocaml/overrides.js:34
    if (err instanceof Error) throw err;
                              ^


Error: assert_equal: 0x0000000000000000000000000000000000000000000000000000000000000001 != 0x0000000000000000000000000000000000000000000000000000000000000000
    at failwith (/home/gregor/.opam/4.14.0/lib/ocaml/stdlib.ml:29:34)
    at <anonymous> (/home/gregor/.opam/4.14.0/lib/base/printf.ml:6:43)
    at caml_call_gen (/builtin/+stdlib.js:32:12)
    at <anonymous> (/builtin/+stdlib.js:42:14)
    at caml_call_gen (/builtin/+stdlib.js:28:22)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at caml_call3 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7532:40)
    at assert_equal (/workspace_root/src/lib/snarky/src/base/checked.ml:84:11)
    at caml_call3 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7532:28)
    at equal$1 (/workspace_root/src/lib/snarky/src/base/snark0.ml:394:25)
    at caml_call2 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7530:28)
    at equal$3 (/workspace_root/src/lib/snarky/src/base/snark0.ml:1094:29)
    at caml_call2 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7530:28)
    at <anonymous> (/workspace_root/src/lib/snarkyjs/src/bindings/ocaml/lib/snarky_js_bindings_lib.ml:390:11)
    at caml_call_gen (/builtin/+stdlib.js:32:12)
    at <anonymous> (/builtin/+jslib.js:252:14)
    at Object.eval [as assertEquals] (eval at caml_js_eval_string (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:3549:44), <anonymous>:4:20)
    at TrivialZkapp.myMethod (file:///home/gregor/o1/mina/src/lib/snarkyjs/dist/node/examples/trivial_zkapp.js:8:7)
    at <anonymous> (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/zkapp.ts:323:24)
    at runWith (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/global-context.ts:89:14)
    at Function.runWith (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/global-context.ts:43:9)
    at <anonymous> (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/zkapp.ts:316:61)
    at runWith (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/global-context.ts:89:14)
    at Function.runWith (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/global-context.ts:43:9)
    at TrivialZkapp.wrappedMethod (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/zkapp.ts:174:35)
    at file:///home/gregor/o1/mina/src/lib/snarkyjs/dist/node/examples/trivial_zkapp.js:36:9
    at createTransaction (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/mina.ts:228:11)
    at Object.transaction (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/mina.ts:572:14)
    at Module.transaction (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/mina.ts:1016:25)
    at file:///home/gregor/o1/mina/src/lib/snarkyjs/dist/node/examples/trivial_zkapp.js:35:17

Node.js v19.8.1`;

const insideCircuitStackTrace = `
Error when proving TrivialZkapp.myMethod()
/workspace_root/src/lib/snarkyjs/src/bindings/ocaml/overrides.js:34
    if (err instanceof Error) throw err;
                              ^


Error: Constraint unsatisfied (unreduced):
Checked.Assert.equal
rule_main
step_main

Constraint:
((basic(Equal(Add(Scale 2(Var 95))(Scale 28948022309329048855892746252171976963363056481941560715954676764349967630336(Var 94)))(Constant 0)))(annotation(Checked.Assert.equal)))
Data:
Equal 1 0
    at failwith (/home/gregor/.opam/4.14.0/lib/ocaml/stdlib.ml:29:34)
    at <anonymous> (/home/gregor/.opam/4.14.0/lib/base/printf.ml:6:43)
    at caml_call_gen (/builtin/+stdlib.js:32:12)
    at <anonymous> (/builtin/+stdlib.js:42:14)
    at caml_call_gen (/builtin/+stdlib.js:28:22)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at caml_call5 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7536:46)
    at <anonymous> (/workspace_root/src/lib/snarky/src/base/checked_runner.ml:216:13)
    at caml_call_gen (/builtin/+stdlib.js:32:12)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at caml_call2 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7530:37)
    at run (/workspace_root/src/lib/snarky/src/base/snark0.ml:748:27)
    at equal$3 (/workspace_root/src/lib/snarky/src/base/snark0.ml:1094:29)
    at caml_call2 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7530:28)
    at <anonymous> (/workspace_root/src/lib/snarkyjs/src/bindings/ocaml/lib/snarky_js_bindings_lib.ml:390:11)
    at caml_call_gen (/builtin/+stdlib.js:32:12)
    at <anonymous> (/builtin/+jslib.js:252:14)
    at Object.eval [as assertEquals] (eval at caml_js_eval_string (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:3549:44), <anonymous>:4:20)
    at TrivialZkapp.myMethod (file:///home/gregor/o1/mina/src/lib/snarkyjs/dist/node/examples/trivial_zkapp.js:8:28)
    at <anonymous> (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/zkapp.ts:213:32)
    at runWith (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/global-context.ts:89:14)
    at Function.runWith (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/global-context.ts:43:9)
    at <anonymous> (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/zkapp.ts:211:53)
    at runWith (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/global-context.ts:89:14)
    at Function.runWith (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/global-context.ts:43:9)
    at <anonymous> (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/zkapp.ts:189:54)
    at runWith (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/global-context.ts:89:14)
    at Function.runWith (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/global-context.ts:43:9)
    at TrivialZkapp.wrappedMethod (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/zkapp.ts:174:35)
    at <anonymous> (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/zkapp.ts:698:38)
    at main (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/proof_system.ts:513:5)
    at caml_call2 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7530:28)
    at _gKI_ (/workspace_root/src/lib/snarkyjs/src/bindings/ocaml/lib/snarky_js_bindings_lib.ml:2021:30)
    at caml_call1 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7528:28)
    at <anonymous> (/workspace_root/src/lib/pickles/step_main.ml:292:15)
    at caml_call1 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7528:28)
    at with_label (/workspace_root/src/lib/snarky/src/base/snark0.ml:1260:15)
    at caml_call2 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7530:28)
    at <anonymous> (/workspace_root/src/lib/pickles/step_main.ml:291:11)
    at caml_call1 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7528:28)
    at with_label (/workspace_root/src/lib/snarky/src/base/snark0.ml:1260:15)
    at caml_call2 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7530:28)
    at main (/workspace_root/src/lib/pickles/step_main.ml:277:5)
    at caml_call_gen (/builtin/+stdlib.js:32:12)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at caml_call2 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7530:37)
    at <anonymous> (/workspace_root/src/lib/pickles/step.ml:834:43)
    at caml_call1 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7528:28)
    at handle (/workspace_root/src/lib/snarky/src/base/snark0.ml:1244:15)
    at caml_call2 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7530:28)
    at _iRJ_ (/workspace_root/src/lib/pickles/step.ml:833:21)
    at caml_call_gen (/builtin/+stdlib.js:32:12)
    at <anonymous> (/builtin/+stdlib.js:42:14)
    at caml_call_gen (/builtin/+stdlib.js:28:22)
    at caml_call1 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7528:34)
    at mark_active (/workspace_root/src/lib/snarky/src/base/snark0.ml:1174:19)
    at _pCY_ (/workspace_root/src/lib/snarky/src/base/snark0.ml:1309:52)
    at caml_call_gen (/builtin/+stdlib.js:32:12)
    at <anonymous> (/builtin/+stdlib.js:42:14)
    at caml_call_gen (/builtin/+stdlib.js:28:22)
    at caml_call1 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7528:34)
    at as_stateful (/workspace_root/src/lib/snarky/src/base/snark0.ml:754:15)
    at caml_call2 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7530:28)
    at handlers (/workspace_root/src/lib/snarky/src/base/runners.ml:82:22)
    at caml_call2 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7530:28)
    at <anonymous> (/workspace_root/src/lib/snarky/src/base/runners.ml:337:13)
    at caml_call4 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7534:28)
    at <anonymous> (/workspace_root/src/lib/snarky/src/base/runners.ml:305:34)
    at caml_call_gen (/builtin/+stdlib.js:32:12)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at <anonymous> (/builtin/+stdlib.js:42:14)
    at caml_call_gen (/builtin/+stdlib.js:28:22)
    at caml_call5 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7536:46)
    at /home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:128556:38
    at caml_call_gen (/builtin/+stdlib.js:32:12)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at caml_call6 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7540:16)
    at <anonymous> (/workspace_root/src/lib/snarky/src/base/snark0.ml:1309:19)
    at caml_call1 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7528:28)
    at finalize_is_running (/workspace_root/src/lib/snarky/src/base/snark0.ml:1279:15)
    at generate_witness_conv (/workspace_root/src/lib/snarky/src/base/snark0.ml:1308:7)
    at caml_call_gen (/builtin/+stdlib.js:32:12)
    at <anonymous> (/builtin/+stdlib.js:42:14)
    at caml_call_gen (/builtin/+stdlib.js:28:22)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at <anonymous> (/builtin/+stdlib.js:42:14)
    at caml_call_gen (/builtin/+stdlib.js:28:22)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at caml_call4 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7534:43)
    at <anonymous> (/workspace_root/src/lib/pickles/step.ml:807:7)
    at caml_call_gen (/builtin/+stdlib.js:32:12)
    at caml_call_gen (/builtin/+stdlib.js:34:12)
    at <anonymous> (/builtin/+stdlib.js:42:14)
    at caml_call_gen (/builtin/+stdlib.js:28:22)
    at caml_call10 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7556:16)
    at wrap (/workspace_root/src/lib/pickles/compile.ml:752:34)
    at caml_call2 (/home/gregor/o1/mina/src/lib/snarkyjs/dist/node/_node_bindings/snarky_js_node.bc.cjs:7530:28)
    at prove (/workspace_root/src/lib/snarkyjs/src/bindings/ocaml/lib/snarky_js_bindings_lib.ml:2290:7)
    at <anonymous> (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/proof_system.ts:445:37)
    at withThreadPool (/home/gregor/o1/mina/src/lib/snarkyjs/src/bindings/js/node/node-backend.js:53:20)
    at <anonymous> (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/account_update.ts:1957:22)
    at runWithAsync (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/global-context.ts:105:14)
    at runWithAsync (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/global-context.ts:105:14)
    at addProof (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/account_update.ts:1949:25)
    at addMissingProofs (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/account_update.ts:1985:42)
    at Object.prove (/home/gregor/o1/mina/src/lib/snarkyjs/src/lib/mina.ts:298:38)
    at async file:///home/gregor/o1/mina/src/lib/snarkyjs/dist/node/examples/trivial_zkapp.js:38:1

Node.js v19.8.1`;

describe('prettifyStacktrace', () => {
  it("should remove any reference of 'snarky_js_node.bc.cjs'", () => {
    const outsideCircuitLines = prettifyStacktrace(
      outsideCircuitStackTrace
    ).split('\n');

    const insideCircuitLines = prettifyStacktrace(
      insideCircuitStackTrace
    ).split('\n');

    expect(outsideCircuitLines).not.toContain('snarky_js_node.bc.cjs');
    expect(insideCircuitLines).not.toContain('snarky_js_node.bc.cjs');
  });

  it("should remove any reference of '/builtin/", () => {
    const outsideCircuitLines = prettifyStacktrace(
      outsideCircuitStackTrace
    ).split('\n');

    const insideCircuitLines = prettifyStacktrace(
      insideCircuitStackTrace
    ).split('\n');

    expect(outsideCircuitLines).not.toContain('/builtin/');
    expect(insideCircuitLines).not.toContain('/builtin/');
  });

  it("should not contain any reference to 'caml_call'", () => {
    const outsideCircuitLines = prettifyStacktrace(
      outsideCircuitStackTrace
    ).split('\n');

    const insideCircuitLines = prettifyStacktrace(
      insideCircuitStackTrace
    ).split('\n');

    expect(outsideCircuitLines).not.toContain('caml_call');
    expect(insideCircuitLines).not.toContain('caml_call');
  });

  it('should not contain any reference to the mina directory', () => {
    const outsideCircuitLines = prettifyStacktrace(
      outsideCircuitStackTrace
    ).split('\n');

    const insideCircuitLines = prettifyStacktrace(
      insideCircuitStackTrace
    ).split('\n');

    expect(outsideCircuitLines).not.toContain('mina');
    expect(insideCircuitLines).not.toContain('mina');
  });

  it('should not contain any reference to the opam directory', () => {
    const outsideCircuitLines = prettifyStacktrace(
      outsideCircuitStackTrace
    ).split('\n');

    const insideCircuitLines = prettifyStacktrace(
      insideCircuitStackTrace
    ).split('\n');

    expect(outsideCircuitLines).not.toContain('opam');
    expect(insideCircuitLines).not.toContain('opam');
  });

  it('should have the same first and last lines as the original stacktrace', () => {
    const outsideCircuitLines = prettifyStacktrace(
      outsideCircuitStackTrace
    ).split('\n');

    const insideCircuitLines = prettifyStacktrace(
      insideCircuitStackTrace
    ).split('\n');

    expect(outsideCircuitLines[0]).toEqual(
      outsideCircuitStackTrace.split('\n')[0]
    );
    expect(outsideCircuitLines[outsideCircuitLines.length - 1]).toEqual(
      outsideCircuitStackTrace.split('\n')[
        outsideCircuitStackTrace.split('\n').length - 1
      ]
    );

    expect(insideCircuitLines[0]).toEqual(
      insideCircuitStackTrace.split('\n')[0]
    );
    expect(insideCircuitLines[insideCircuitLines.length - 1]).toEqual(
      insideCircuitStackTrace.split('\n')[
        insideCircuitStackTrace.split('\n').length - 1
      ]
    );
  });
});
