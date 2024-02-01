import { expect } from 'expect';
import { AccountUpdate, Mina, UInt64 } from 'o1js';
import { getProfiler } from '../../utils/profiler.js';
import { tic, toc } from '../../utils/tic-toc.node.js';
import { TokenContract, addresses, createDex, keys, tokenIds } from './dex.js';

const TokenProfiler = getProfiler('Token with Proofs');
TokenProfiler.start('Token with proofs test flow');
let proofsEnabled = true;

tic('Happy path with proofs');
console.log();
let Local = Mina.LocalBlockchain({
  proofsEnabled,
  enforceTransactionLimits: false,
});
Mina.setActiveInstance(Local);
let [{ privateKey: feePayerKey, publicKey: feePayerAddress }] =
  Local.testAccounts;
let tx, balances, oldBalances;

let { Dex, DexTokenHolder, getTokenBalances } = createDex();

TokenContract.analyzeMethods();
DexTokenHolder.analyzeMethods();
Dex.analyzeMethods();

if (proofsEnabled) {
  tic('compile (token)');
  await TokenContract.compile();
  toc();
  tic('compile (dex token holder)');
  await DexTokenHolder.compile();
  toc();
  tic('compile (dex main contract)');
  await Dex.compile();
  toc();
}

let tokenX = new TokenContract(addresses.tokenX);
let tokenY = new TokenContract(addresses.tokenY);
let dex = new Dex(addresses.dex);
let dexTokenHolderX = new DexTokenHolder(addresses.dex, tokenIds.X);
let dexTokenHolderY = new DexTokenHolder(addresses.dex, tokenIds.Y);

tic('deploy & init token contracts');
tx = await Mina.transaction(feePayerAddress, () => {
  const accountFee = Mina.getNetworkConstants().accountCreationFee;
  // pay fees for creating 2 token contract accounts, and fund them so each can create 1 account themselves
  let feePayerUpdate = AccountUpdate.createSigned(feePayerAddress);
  feePayerUpdate.balance.subInPlace(accountFee.mul(2));
  feePayerUpdate.send({ to: addresses.tokenX, amount: accountFee });
  feePayerUpdate.send({ to: addresses.tokenY, amount: accountFee });
  tokenX.deploy();
  tokenY.deploy();
});
await tx.prove();
await tx.sign([feePayerKey, keys.tokenX, keys.tokenY]).send();
toc();
console.log('account updates length', tx.transaction.accountUpdates.length);

tic('deploy dex contracts');
tx = await Mina.transaction(feePayerAddress, () => {
  // pay fees for creating 3 dex accounts
  AccountUpdate.createSigned(feePayerAddress).balance.subInPlace(
    Mina.getNetworkConstants().accountCreationFee.mul(3)
  );
  dex.deploy();
  dexTokenHolderX.deploy();
  tokenX.approveAccountUpdate(dexTokenHolderX.self);
  dexTokenHolderY.deploy();
  tokenY.approveAccountUpdate(dexTokenHolderY.self);
});
await tx.prove();
await tx.sign([feePayerKey, keys.dex]).send();
toc();
console.log('account updates length', tx.transaction.accountUpdates.length);

tic('transfer tokens to user');
let USER_DX = 1_000n;
tx = await Mina.transaction(feePayerAddress, () => {
  // pay fees for creating 3 user accounts
  let feePayer = AccountUpdate.fundNewAccount(feePayerAddress, 3);
  feePayer.send({ to: addresses.user, amount: 20e9 }); // give users MINA to pay fees
  tokenX.transfer(addresses.tokenX, addresses.user, UInt64.from(USER_DX));
  tokenY.transfer(addresses.tokenY, addresses.user, UInt64.from(USER_DX));
});
await tx.prove();
await tx.sign([feePayerKey, keys.tokenX, keys.tokenY]).send();
toc();
console.log('account updates length', tx.transaction.accountUpdates.length);
[oldBalances, balances] = [balances, getTokenBalances()];
expect(balances.user.X).toEqual(USER_DX);

tic('supply liquidity');
tx = await Mina.transaction(addresses.user, () => {
  AccountUpdate.fundNewAccount(addresses.user);
  dex.supplyLiquidityBase(UInt64.from(USER_DX), UInt64.from(USER_DX));
});
await tx.prove();
await tx.sign([keys.user]).send();
toc();
console.log('account updates length', tx.transaction.accountUpdates.length);
[oldBalances, balances] = [balances, getTokenBalances()];
expect(balances.user.X).toEqual(0n);

tic('redeem liquidity');
let USER_DL = 100n;
tx = await Mina.transaction(addresses.user, () => {
  dex.redeemLiquidity(UInt64.from(USER_DL));
});

console.log(tx.transaction.accountUpdates[0].toPrettyLayout());
console.log(tx.toPretty());

await tx.prove();
await tx.sign([keys.user]).send();
toc();
console.log('account updates length', tx.transaction.accountUpdates.length);
[oldBalances, balances] = [balances, getTokenBalances()];
expect(balances.user.X).toEqual(USER_DL / 2n);

tic('swap 10 X for Y');
USER_DX = 10n;
tx = await Mina.transaction(addresses.user, () => {
  dex.swapX(UInt64.from(USER_DX));
});
await tx.prove();
await tx.sign([keys.user]).send();
toc();
console.log('account updates length', tx.transaction.accountUpdates.length);
[oldBalances, balances] = [balances, getTokenBalances()];
expect(balances.user.X).toEqual(oldBalances.user.X - USER_DX);

toc();
console.log('dex happy path with proofs was successful! 🎉');
TokenProfiler.stop().store();
