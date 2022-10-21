/**
 * This is file serves as an integration test for the DEX application.
 * It aims to make sure that certain error cases are correctly caught by the application.
 */

import { isReady, Mina, AccountUpdate, UInt64, shutdown } from 'snarkyjs';
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

console.log('-------------------------------------------------');
console.log('FEE PAYER\t', feePayerKey.toPublicKey().toBase58());
console.log('TOKEN X ADDRESS\t', addresses.tokenX.toBase58());
console.log('TOKEN Y ADDRESS\t', addresses.tokenY.toBase58());
console.log('DEX ADDRESS\t', addresses.dex.toBase58());
console.log('USER ADDRESS\t', addresses.user.toBase58());
console.log('-------------------------------------------------');

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
await tx.send();

console.log(
  'TokenX tokens: ',
  Mina.getBalance(tokenX.address, tokenIds.X).value.toBigInt(),
  'TokenY tokens: ',
  Mina.getBalance(tokenY.address, tokenIds.Y).value.toBigInt()
);

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
await tx.send();

console.log('create token accounts for user...');
tx = await Mina.transaction({ feePayerKey, fee: accountFee.mul(1) }, () => {
  AccountUpdate.createSigned(feePayerKey).balance.subInPlace(
    Mina.accountCreationFee().mul(2)
  );
  tokenX.transfer(addresses.tokenX, addresses.user, UInt64.from(0));
  tokenY.transfer(addresses.tokenY, addresses.user, UInt64.from(0));
});

await tx.prove();
tx.sign([keys.tokenX, keys.tokenY]);
await tx.send();

console.log('(should fail)... supply liquididty -- supplying with no tokens');
console.log(
  'User tokens X: ',
  Mina.getBalance(addresses.user, tokenIds.X).value.toBigInt(),
  '\nUser tokens Y: ',
  Mina.getBalance(addresses.user, tokenIds.Y).value.toBigInt()
);

tx = await Mina.transaction({ feePayerKey, fee: accountFee.mul(1) }, () => {
  AccountUpdate.createSigned(feePayerKey).balance.subInPlace(
    Mina.accountCreationFee().mul(1)
  );
  dex.supplyLiquidityBase(addresses.user, UInt64.from(100), UInt64.from(100));
});

await tx.prove();
// TODO: This is a hack to get around the fact that `caller` is wrong when creating
// child accountUpdates with the token API. We manually set the caller to the DEX in this case.
// Should be fixed with https://github.com/o1-labs/snarkyjs/issues/431
tx.transaction.accountUpdates[2].body.caller = dex.experimental.token.id;
tx.transaction.accountUpdates[4].body.caller = dex.experimental.token.id;
tx.transaction.accountUpdates[6].body.caller = dex.experimental.token.id;
tx.transaction.accountUpdates[9].body.caller = dex.experimental.token.id;

tx.sign([keys.dex, keys.user, keys.tokenX]);
try {
  await tx.send();
} catch (e) {
  console.log('(should fail)...[ok]');
}

console.log('transfer tokens to user');
tx = await Mina.transaction({ feePayerKey, fee: accountFee.mul(1) }, () => {
  tokenX.transfer(addresses.tokenX, addresses.user, UInt64.from(10));
  tokenY.transfer(addresses.tokenY, addresses.user, UInt64.from(10));
});

await tx.prove();
tx.sign([keys.tokenX, keys.tokenY]);
await tx.send();

console.log(
  '(should fail)... supply liquididty -- supplying with not enough tokens (100)'
);
console.log(
  'User tokens X: ',
  Mina.getBalance(addresses.user, tokenIds.X).value.toBigInt(),
  '\nUser tokens Y: ',
  Mina.getBalance(addresses.user, tokenIds.Y).value.toBigInt()
);

tx = await Mina.transaction({ feePayerKey, fee: accountFee.mul(1) }, () => {
  AccountUpdate.createSigned(feePayerKey).balance.subInPlace(
    Mina.accountCreationFee().mul(1)
  );
  dex.supplyLiquidityBase(addresses.user, UInt64.from(100), UInt64.from(100));
});

await tx.prove();
tx.sign([keys.dex, keys.user, keys.tokenX]);
try {
  await tx.send();
} catch (e) {
  console.log('(should fail)...[ok]');
}

shutdown();
