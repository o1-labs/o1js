import {
  Field,
  state,
  State,
  method,
  UInt64,
  PrivateKey,
  SmartContract,
  Mina,
  Party,
  isReady,
  Permissions,
  shutdown,
  compile,
  DeployArgs,
  sendZkappQuery,
  fetchAccount,
  Bool,
} from 'snarkyjs';

await isReady;

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.self.update.permissions.setValue({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    this.balance.addInPlace(UInt64.fromNumber(initialBalance));
    this.x.set(initialState);
  }

  @method update(y: Field) {
    let x = this.x.get();
    y.assertGt(0);
    this.x.set(x.add(y));
  }
}

let Berkeley = Mina.BerkeleyQANet();
Mina.setActiveInstance(Berkeley);

let whaleAccount = Berkeley.testAccounts[0].privateKey;

let zkappKey = PrivateKey.fromBase58(
  'EKFQZG2RuLMYyDsC9RGE5Y8gQGefkbUUUyEhFbgRRMHGgoF9eKpY'
);
let zkappAddress = zkappKey.toPublicKey();
let zkappAddressBase58 = zkappAddress.toBase58();

let initialBalance = 10_000_000_000;
let transactionFee = 100_000_000;
let initialState = Field(1);
let doComputeVk = false;

// check if the zkapp is already deployed, based on whether the account exists and its first zkapp state is != 0
let { account } = await fetchAccount(zkappAddressBase58);
let isDeployed =
  account?.zkapp?.appState[0].equals(0).not().toBoolean() ?? false;

console.log(
  'using whale account:',
  JSON.stringify(
    (await fetchAccount(whaleAccount.toPublicKey().toBase58())).account
  )
);

if (!isDeployed) {
  console.log(`Deploying zkapp for public key ${zkappAddressBase58}!`);
  console.log('Compiling smart contract...');
  let { verificationKey } = doComputeVk
    ? await compile(SimpleZkapp, zkappAddress)
    : { verificationKey: undefined };

  console.log('Generating deploy transaction...');
  let tx = await Berkeley.transaction(
    { privateKey: whaleAccount, fee: transactionFee },
    () => {
      const p = Party.createSigned(whaleAccount, { isSameAsFeePayer: true });
      p.balance.subInPlace(UInt64.fromNumber(initialBalance));
      let zkapp = new SimpleZkapp(zkappAddress);
      zkapp.deploy({ zkappKey, verificationKey });
    }
  );
  tx.sign();
  console.log(sendZkappQuery(tx.toJSON()));
}

if (isDeployed) {
  console.log(
    `Found deployed zkapp for public key ${zkappAddressBase58}. Creating zkapp update.`
  );
  let tx = await Berkeley.transaction(
    { privateKey: whaleAccount, fee: transactionFee },
    () => {
      let zkapp = new SimpleZkapp(zkappAddress);
      zkapp.update(Field(2));
      // TODO: proving
      zkapp.self.sign(zkappKey);
      zkapp.self.body.incrementNonce = Bool(true);
    }
  );
  tx.sign();
  console.log(sendZkappQuery(tx.toJSON()));
}

shutdown();
