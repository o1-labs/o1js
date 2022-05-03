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
  Permissions,
  shutdown,
  compile,
  DeployArgs,
  fetchAccount,
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

let whaleKey = Berkeley.testAccounts[0].privateKey;

// let zkappKey = PrivateKey.random();
let zkappKey = PrivateKey.fromBase58(
  'EKFQZG2RuLMYyDsC9RGE5Y8gQGefkbUUUyEhFbgRRMHGgoF9eKpY'
);
let zkappAddress = zkappKey.toPublicKey();

let transactionFee = 100_000_000;
let initialState = Field(1);
let doComputeVk = false;

// check if the zkapp is already deployed, based on whether the account exists and its first zkapp state is != 0
let zkapp = new SimpleZkapp(zkappAddress);
let x = await zkapp.x.fetch();
let isDeployed = x.equals(0).not().toBoolean() ?? false;

let { account: whaleAccount } = await fetchAccount(whaleKey.toPublicKey());
let { nonce, balance } = whaleAccount!;
console.log(`using whale account with nonce ${nonce}, balance ${balance}`);

if (!isDeployed) {
  console.log(`Deploying zkapp for public key ${zkappAddress.toBase58()}!`);
  console.log('Compiling smart contract...');
  let { verificationKey } = doComputeVk
    ? await compile(SimpleZkapp, zkappAddress)
    : { verificationKey: undefined };

  console.log('Generating deploy transaction...');
  let tx = await Berkeley.transaction(
    { privateKey: whaleKey, fee: transactionFee },
    () => {
      const p = Party.createSigned(whaleKey, { isSameAsFeePayer: true });
      p.balance.subInPlace(Mina.accountCreationFee());
      zkapp.deploy({ zkappKey, verificationKey });
    }
  );
  await tx.send().wait();
}

if (isDeployed) {
  let x = zkapp.x.get();
  let xNext = x.add(2);
  console.log(
    `Found deployed zkapp with state x=${x}!\nCreating zkapp update to x=${xNext}.`
  );
  let tx = await Berkeley.transaction(
    { privateKey: whaleKey, fee: transactionFee },
    () => {
      zkapp.update(Field(2));
      // TODO: proving
      zkapp.sign(zkappKey);
    }
  );
  await tx.send().wait();
}

shutdown();
