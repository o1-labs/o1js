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
  tokenX.init();
  tokenY.init();
});
await tx.prove();
tx.sign([keys.tokenX, keys.tokenY]);
console.log(tx.toPretty());
await tx.send();

console.log('deploy dex contracts...');
tx = await Mina.transaction(feePayerKey, () => {
  // pay fees for creating 3 dex accounts
  AccountUpdate.createSigned(feePayerKey).balance.subInPlace(accountFee.mul(3));
  dex.deploy();
  tokenX.deployZkapp(addresses.dex, DexTokenHolder._verificationKey!);
  tokenY.deployZkapp(addresses.dex, DexTokenHolder._verificationKey!);
});
await tx.prove();
tx.sign([keys.dex]);
console.log(tx.toPretty());
await tx.send();

// send tokens
console.log('send X tokens from user to dex...');
tx = await Mina.transaction({ feePayerKey, fee: accountFee.mul(1) }, () => {
  AccountUpdate.fundNewAccount(feePayerKey);
  tokenX.transfer(addresses.tokenX, addresses.user, UInt64.from(100_000));
  dex.supplyTokenX(addresses.user, UInt64.from(100_000));
});
await tx.prove();
tx.sign([keys.dex, keys.user, keys.tokenX]);
console.log(tx.toPretty());
await tx.send();
