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
    this.x.assertEquals(x);
    y.assertGt(0);
    this.x.set(x.add(y));
  }
}

// you can use this with any spec-compliant graphql endpoint
let Berkeley = Mina.BerkeleyQANet(
  'https://proxy.berkeley.minaexplorer.com/graphql'
);
Mina.setActiveInstance(Berkeley);

// to use this test, change this private key to an account which has enough MINA to pay fees
let feePayerKey = PrivateKey.fromBase58(
  'EKEQc95PPQZnMY9d9p1vq1MWLeDJKtvKj4V75UDG3rjnf32BerWD'
);
let response = await fetchAccount({ publicKey: feePayerKey.toPublicKey() });
if (response.error) throw Error(response.error.statusText);
let { nonce, balance } = response.account;
console.log(`Using fee payer account with nonce ${nonce}, balance ${balance}`);

// this is an actual zkapp that was deployed and updated with this script:
// https://berkeley.minaexplorer.com/wallet/B62qpRzFVjd56FiHnNfxokVbcHMQLT119My1FEdSq8ss7KomLiSZcan
// replace this with a new zkapp key if you want to deploy another zkapp
// and please never expose actual private keys in public code repositories like this!
let zkappKey = PrivateKey.fromBase58(
  'EKFQZG2RuLMYyDsC9RGE5Y8gQGefkbUUUyEhFbgRRMHGgoF9eKpY'
);
let zkappAddress = zkappKey.toPublicKey();

let transactionFee = 100_000_000;
let initialState = Field(1);

// compile the SmartContract to get the verification key (if deploying) or cache the provers (if updating)
// this can take a while...
console.log('Compiling smart contract...');
let { verificationKey } = await SimpleZkapp.compile(zkappAddress);

// check if the zkapp is already deployed, based on whether the account exists and its first zkapp state is != 0
let zkapp = new SimpleZkapp(zkappAddress);
let x = await zkapp.x.fetch();
let isDeployed = x?.equals(0).not().toBoolean() ?? false;

// if the zkapp is not deployed yet, create a deploy transaction
if (!isDeployed) {
  console.log(`Deploying zkapp for public key ${zkappAddress.toBase58()}.`);
  // the `transaction()` interface is the same as when testing with a local blockchain
  let transaction = await Mina.transaction(
    { feePayerKey, fee: transactionFee },
    () => {
      Party.fundNewAccount(feePayerKey);
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
  console.log(`Found deployed zkapp, updating state ${x} -> ${x.add(10)}.`);
  let transaction = await Mina.transaction(
    { feePayerKey, fee: transactionFee },
    () => {
      zkapp.update(Field(10));
    }
  );
  // fill in the proof - this can take a while...
  console.log('Creating an execution proof...');
  await transaction.prove();

  // if you want to inspect the transaction, you can print it out:
  // console.log(transaction.toGraphqlQuery());

  // send the transaction to the graphql endpoint
  console.log('Sending the transaction...');
  await transaction.send().wait();
}

shutdown();
