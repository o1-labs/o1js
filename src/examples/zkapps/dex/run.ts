import {
  isReady,
  Mina,
  AccountUpdate,
  UInt64,
  shutdown,
  Token,
} from 'snarkyjs';
import {
  Dex,
  DexTokenHolder,
  TokenContract,
  addresses,
  keys,
  tokenIds,
} from './dex.js';

await isReady;
let doProofs = false;

let Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
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
console.log('TOKEN X ID\t', Token.Id.toBase58(tokenIds.X));
console.log('TOKEN Y ID\t', Token.Id.toBase58(tokenIds.Y));
console.log('-------------------------------------------------');

// analyze methods for quick error feedback
TokenContract.analyzeMethods();
DexTokenHolder.analyzeMethods();
Dex.analyzeMethods();

// compile & deploy all 5 zkApps
console.log('compile (token)...');
await TokenContract.compile();
console.log('compile (dex token holder)...');
await DexTokenHolder.compile();
console.log('compile (dex main contract)...');
await Dex.compile();

let tokenX = new TokenContract(addresses.tokenX);
let tokenY = new TokenContract(addresses.tokenY);
let dex = new Dex(addresses.dex);

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

console.log('transfer tokens to user');
tx = await Mina.transaction({ feePayerKey, fee: accountFee.mul(1) }, () => {
  AccountUpdate.createSigned(feePayerKey).balance.subInPlace(
    Mina.accountCreationFee().mul(2)
  );
  tokenX.transfer(addresses.tokenX, addresses.user, UInt64.from(10_000));
  tokenY.transfer(addresses.tokenY, addresses.user, UInt64.from(10_000));
});

await tx.prove();
tx.sign([keys.tokenX, keys.tokenY]);
await tx.send();

console.log(
  'User tokens X: ',
  Mina.getBalance(addresses.user, tokenIds.X).value.toBigInt(),
  '\nUser tokens Y: ',
  Mina.getBalance(addresses.user, tokenIds.Y).value.toBigInt()
);

console.log('user supply liquidity -- base');
tx = await Mina.transaction({ feePayerKey, fee: accountFee.mul(1) }, () => {
  // needed because the user account for the liquidity token is created
  AccountUpdate.createSigned(feePayerKey).balance.subInPlace(
    Mina.accountCreationFee().mul(1)
  );
  dex.supplyLiquidityBase(addresses.user, UInt64.from(100), UInt64.from(100));
});

await tx.prove();
tx.sign([keys.user]);
await tx.send();

console.log(
  'DEX liquidity (X, Y): ',
  Mina.getBalance(addresses.dex, tokenIds.X).value.toBigInt(),
  Mina.getBalance(addresses.dex, tokenIds.Y).value.toBigInt()
);
console.log(
  'user DEX tokens: ',
  Mina.getBalance(addresses.user, tokenIds.lqXY).value.toBigInt()
);

console.log('user supply liquidity');
tx = await Mina.transaction({ feePayerKey, fee: accountFee.mul(1) }, () => {
  dex.supplyLiquidity(addresses.user, UInt64.from(100));
});

await tx.prove();
tx.sign([keys.user]);
await tx.send();

console.log(
  'DEX liquidity (X, Y): ',
  Mina.getBalance(addresses.dex, tokenIds.X).value.toBigInt(),
  Mina.getBalance(addresses.dex, tokenIds.Y).value.toBigInt()
);

console.log(
  'user DEX tokens: ',
  Mina.getBalance(addresses.user, tokenIds.lqXY).value.toBigInt()
);

console.log('user redeem liquidity');
tx = await Mina.transaction({ feePayerKey, fee: accountFee.mul(1) }, () => {
  dex.redeemLiquidity(addresses.user, UInt64.from(100));
});
await tx.prove();
tx.sign([keys.user]);
await tx.send();

console.log(
  'DEX liquidity (X, Y): ',
  Mina.getBalance(addresses.dex, tokenIds.X).value.toBigInt(),
  Mina.getBalance(addresses.dex, tokenIds.Y).value.toBigInt()
);

console.log(
  'user DEX tokens: ',
  Mina.getBalance(addresses.user, tokenIds.lqXY).value.toBigInt()
);
console.log(
  'User tokens X: ',
  Mina.getBalance(addresses.user, tokenIds.X).value.toBigInt(),
  '\nUser tokens Y: ',
  Mina.getBalance(addresses.user, tokenIds.Y).value.toBigInt()
);

console.log('swap 10 X for Y');
tx = await Mina.transaction({ feePayerKey, fee: accountFee.mul(1) }, () => {
  dex.swapX(addresses.user, UInt64.from(10));
});
await tx.prove();
tx.sign([keys.user]);
await tx.send();

console.log(
  'User tokens X: ',
  Mina.getBalance(addresses.user, tokenIds.X).value.toBigInt(),
  '\nUser tokens Y: ',
  Mina.getBalance(addresses.user, tokenIds.Y).value.toBigInt()
);

shutdown();
