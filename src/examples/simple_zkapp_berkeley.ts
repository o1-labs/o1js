/**
 * This is an example for interacting with the Berkeley QANet, directly from snarkyjs.
 *
 * At a high level, it does the following:
 * -) try fetching the account corresponding to the `zkappAddress` from chain
 * -) if the account doesn't exist or is not a zkapp account yet, deploy a zkapp to it and initialize on-chain state
 * -) if the zkapp is already deployed, send a state-updating transaction which proves execution of the "update" method
 */

import {
  Field,
  state,
  State,
  method,
  PrivateKey,
  SmartContract,
  Mina,
  Party,
  isReady,
  shutdown,
  compile,
  DeployArgs,
  fetchAccount,
} from 'snarkyjs';

await isReady;

// a very simple SmartContract
class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.x.set(initialState);
  }

  @method update(y: Field) {
    let x = this.x.get();
    y.assertGt(0);
    this.x.set(x.add(y));
  }
}

// you can use this with any spec-compliant graphql endpoint
let Berkeley = Mina.BerkeleyQANet(
  'https://proxy.berkeley.minaexplorer.com/graphql'
);
Mina.setActiveInstance(Berkeley);

// hard-coded test account which has enough MINA to fund our zkapps
let whaleKey = Berkeley.testAccounts[0].privateKey;
let { account: whaleAccount } = await fetchAccount(whaleKey.toPublicKey());
let { nonce, balance } = whaleAccount!;
console.log(`using whale account with nonce ${nonce}, balance ${balance}`);

// let zkappKey = PrivateKey.random();
let zkappKey = PrivateKey.fromBase58(
  'EKFQZG2RuLMYyDsC9RGE5Y8gQGefkbUUUyEhFbgRRMHGgoF9eKpY'
);
let zkappAddress = zkappKey.toPublicKey();

let transactionFee = 100_000_000;
let initialState = Field(1);
let doCompile = true;

// compile the SmartContract to get the verification key (if deploying) or the cache the provers (if updating)
// this can take a while...
console.log('Compiling smart contract...');
let { verificationKey } = doCompile
  ? await compile(SimpleZkapp, zkappAddress)
  : { verificationKey: undefined };

// check if the zkapp is already deployed, based on whether the account exists and its first zkapp state is != 0
let zkapp = new SimpleZkapp(zkappAddress);
let x = await zkapp.x.fetch();
let isDeployed = x.equals(0).not().toBoolean() ?? false;

// if the zkapp is not deployed yet, create a deploy transaction
if (!isDeployed) {
  console.log(`Deploying zkapp for public key ${zkappAddress.toBase58()}.`);
  // the `transaction()` interface
  let transaction = await Mina.transaction(
    { feePayerKey: whaleKey, fee: transactionFee },
    () => {
      const p = Party.createSigned(whaleKey, { isSameAsFeePayer: true });
      p.balance.subInPlace(Mina.accountCreationFee());
      zkapp.deploy({ zkappKey, verificationKey });
    }
  );
  // if you want to inspect the transaction, you can print it out:
  // console.log(transaction.toGraphqlQuery());

  // send the transaction to the graphql endpoint
  console.log('Sending the transaction...');
  await transaction.send().wait();
}

// if the zkapp is not deployed yet, create an update transaction
if (isDeployed) {
  let x = zkapp.x.get();
  console.log(`Found deployed zkapp, updating state ${x} -> ${x.add(2)}.`);
  let transaction = await Mina.transaction(
    { feePayerKey: whaleKey, fee: transactionFee },
    () => {
      zkapp.update(Field(2));
    }
  );
  // fill in the proof - this can take a while...
  await transaction.prove();

  // if you want to inspect the transaction, you can print it out:
  // console.log(transaction.toGraphqlQuery());

  // send the transaction to the graphql endpoint
  console.log('Sending the transaction...');
  await transaction.send().wait();
}

shutdown();
