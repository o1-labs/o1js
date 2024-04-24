/**
 * Transaction benchmarks
 */

import {
  AccountUpdate,
  Field,
  Mina,
  PrivateKey,
  SmartContract,
  State,
  method,
  state,
} from 'o1js';
import { benchmark } from '../benchmark.js';

export { TxnBenchmarks };

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  init() {
    super.init();
    this.x.set(Field(1));
  }

  @method async noOp() {}

  @method async update(y: Field) {
    const x = this.x.getAndRequireEquals();
    this.x.set(x.add(y));
  }
}

let Local = await Mina.LocalBlockchain({
  proofsEnabled: true,
  enforceTransactionLimits: true,
});
Mina.setActiveInstance(Local);

const transactionFee = 100_000_000;
const [feePayer] = Local.testAccounts;
const { verificationKey } = await SimpleZkapp.compile();

let transaction;

const TxnBenchmarks = benchmark(
  'txn',
  async (tic, toc) => {
    const zkappPrivateKey = PrivateKey.random();
    const zkapp = new SimpleZkapp(zkappPrivateKey.toPublicKey());

    tic('simple zkapp deploy transaction construction');
    transaction = await Mina.transaction(
      { sender: feePayer, fee: transactionFee },
      async () => {
        AccountUpdate.fundNewAccount(feePayer);
        await zkapp.deploy({ verificationKey });
      }
    );
    toc();

    tic('simple zkapp deploy transaction signing');
    transaction.sign([feePayer.key, zkappPrivateKey]);
    toc();

    tic('simple zkapp deploy transaction local sending');
    await transaction.send();
    toc();

    tic('simple zkapp call transaction construction');
    transaction = await Mina.transaction(
      { sender: feePayer, fee: transactionFee },
      async () => await zkapp.noOp()
    );
    toc();

    tic('simple zkapp call transaction proving');
    await transaction.prove();
    toc();

    tic('simple zkapp call transaction signing');
    transaction.sign([feePayer.key]);
    toc();

    tic('simple zkapp call transaction local sending');
    await transaction.send();
    toc();
  },
  // two warmups to ensure full caching
  { numberOfWarmups: 2, numberOfRuns: 5 }
);
