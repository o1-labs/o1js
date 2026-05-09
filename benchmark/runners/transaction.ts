/**
 * Focused transaction benchmark runner for end-to-end compile/prove timing.
 *
 * Run with:
 * ```
 * O1JS_TXN_BENCH_RUNS=1 ./run benchmark/runners/transaction.ts
 * ```
 */

import {
  AccountUpdate,
  Field,
  Mina,
  PrivateKey,
  SmartContract,
  State,
  initializeBindings,
  method,
  state,
} from 'o1js';

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  init() {
    super.init();
    this.x.set(Field(1));
  }

  @method async noOp() {}
}

await initializeBindings();

let runs = readBenchmarkCount('O1JS_TXN_BENCH_RUNS', 1);
let Local = await Mina.LocalBlockchain({
  proofsEnabled: true,
  enforceTransactionLimits: true,
});
Mina.setActiveInstance(Local);

let transactionFee = 100_000_000;
let [feePayer] = Local.testAccounts;

let { verificationKey } = await measure('simple zkapp compile', () => SimpleZkapp.compile());

for (let run = 0; run < runs; run++) {
  let zkappPrivateKey = PrivateKey.random();
  let zkapp = new SimpleZkapp(zkappPrivateKey.toPublicKey());

  let deployTransaction = await measure('simple zkapp deploy transaction construction', () =>
    Mina.transaction({ sender: feePayer, fee: transactionFee }, async () => {
      AccountUpdate.fundNewAccount(feePayer);
      await zkapp.deploy({ verificationKey });
    })
  );
  await measure('simple zkapp deploy transaction signing', async () => {
    deployTransaction.sign([feePayer.key, zkappPrivateKey]);
  });
  await measure('simple zkapp deploy transaction local sending', () => deployTransaction.send());

  let callTransaction = await measure('simple zkapp call transaction construction', () =>
    Mina.transaction({ sender: feePayer, fee: transactionFee }, async () => {
      await zkapp.noOp();
    })
  );
  await measure('simple zkapp call transaction proving', () => callTransaction.prove());
  await measure('simple zkapp call transaction signing', async () => {
    callTransaction.sign([feePayer.key]);
  });
  await measure('simple zkapp call transaction local sending', () => callTransaction.send());
}

async function measure<T>(label: string, run: () => Promise<T>) {
  let start = performance.now();
  let value = await run();
  let ms = performance.now() - start;
  console.log(`${label}: ${ms.toFixed(3)}ms`);
  return value;
}

function readBenchmarkCount(env: string, fallback: number) {
  let value = Number(process.env[env] ?? fallback);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}
