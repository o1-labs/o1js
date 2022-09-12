import { isReady, Mina, AccountUpdate, UInt64 } from 'snarkyjs';
import {
  Dex,
  DexTokenHolder,
  TokenContract,
  addresses,
  keys,
  tokenIds,
} from './dex.js';

await isReady;
let doProofs = true;

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);
let accountFee = Mina.accountCreationFee();

let [{ privateKey: feePayerKey }] = Local.testAccounts;

let tokenAccount1 = Local.testAccounts[1];
let tokenAccount2 = Local.testAccounts[2];
let tx;

// analyze methods for quick error feedback
TokenContract.analyzeMethods();
DexTokenHolder.analyzeMethods();
Dex.analyzeMethods();

if (doProofs) {
  // compile & deploy all 5 zkApps
  console.log('compile (token)...');
  await TokenContract.compile();
  console.log('compile (dex token holder)...');
  await DexTokenHolder.compile();
  console.log('compile (dex main contract)...');
  await Dex.compile();
}
let tokenX = new TokenContract(addresses.tokenX);
let tokenY = new TokenContract(addresses.tokenY);
let dex = new Dex(addresses.dex);
let dexX = new DexTokenHolder(addresses.dex, tokenIds.X);
let dexY = new DexTokenHolder(addresses.dex, tokenIds.Y);

console.log('deploy & init token contracts...');
tx = await Mina.transaction({ feePayerKey }, () => {
  // pay fees for creating 2 token contract accounts, and fund them so each can create 1 account themselves
  let feePayerUpdate = AccountUpdate.createSigned(feePayerKey);
  feePayerUpdate.balance.subInPlace(accountFee.mul(2));
  feePayerUpdate.send({ to: addresses.tokenX, amount: accountFee });
  feePayerUpdate.send({ to: addresses.tokenY, amount: accountFee });

  tokenX.deploy();
  tokenY.deploy();

  tokenX.deployZkapp(addresses.dex);
  tokenY.deployZkapp(addresses.dex);
  dex.deploy();

  // initialize tokens
  tokenX.init();
  tokenY.init();
});

// await tx.prove();
tx.sign([keys.tokenX, keys.tokenY, keys.dex]);
console.log(tx.toJSON());
tx.send();

console.log('deploy tokens...');

tx = await Mina.transaction(feePayerKey, () => {
  // pay fees for creating 3 dex accounts
  AccountUpdate.createSigned(feePayerKey).balance.subInPlace(accountFee.mul(3));
  dex.deploy();
  tokenX.deployZkapp(addresses.dex);
  tokenY.deployZkapp(addresses.dex);
});

console.log(tx.toJSON());

// await tx.prove();
tx.sign([keys.dex, keys.tokenX]);

tx.send();

console.log('attempting to transfer tokenX...');

try {
  tx = await Mina.transaction(feePayerKey, () => {
    tokenX.transfer(
      tokenAccount1.publicKey,
      tokenAccount2.publicKey,
      UInt64.from(100_000)
    );
    tokenX.sign(feePayerKey);
  });

  tx.send();
} catch (err) {
  throw Error(err);
}

console.log('attempting to transfer tokenY...');

try {
  tx = await Mina.transaction(feePayerKey, () => {
    tokenY.transfer(
      tokenAccount2.publicKey,
      tokenAccount1.publicKey,
      UInt64.from(100_000)
    );
    tokenY.sign(feePayerKey);
  });

  tx.send();
} catch (err) {
  throw Error(err);
}
