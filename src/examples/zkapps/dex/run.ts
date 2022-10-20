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
  getTokenBalances,
} from './dex.js';
import { expect } from 'expect';

await isReady;
let doProofs = false;

let Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
Mina.setActiveInstance(Local);
let accountFee = Mina.accountCreationFee();

let [{ privateKey: feePayerKey }] = Local.testAccounts;
let tx, balances, oldBalances;
let feePayerAddress = feePayerKey.toPublicKey();

console.log('-------------------------------------------------');
console.log('FEE PAYER\t', feePayerAddress.toBase58());
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
balances = getTokenBalances();
console.log(
  'Token contract tokens (X, Y):',
  balances.tokenContract.X,
  balances.tokenContract.Y
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
  let feePayer = AccountUpdate.createSigned(feePayerKey);
  feePayer.balance.subInPlace(Mina.accountCreationFee().mul(5));
  feePayer.send({ to: addresses.user, amount: 20e9 }); // give user MINA to pay fees
  tokenX.transfer(addresses.tokenX, addresses.user, UInt64.from(10_000));
  tokenY.transfer(addresses.tokenY, addresses.user, UInt64.from(10_000));
  // transfer to fee payer so they can provide initial liquidity
  tokenX.transfer(addresses.tokenX, feePayerAddress, UInt64.from(10_000));
  tokenY.transfer(addresses.tokenY, feePayerAddress, UInt64.from(10_000));
});
await tx.prove();
tx.sign([keys.tokenX, keys.tokenY]);
await tx.send();
[oldBalances, balances] = [balances, getTokenBalances()];
console.log('User tokens (X, Y):', balances.user.X, balances.user.Y);
console.log('User MINA:', balances.user.MINA);

// supply the initial liquidity where the token ratio can be arbitrary
console.log('supply liquidity -- base');
tx = await Mina.transaction({ feePayerKey, fee: accountFee.mul(1) }, () => {
  AccountUpdate.fundNewAccount(feePayerKey);
  dex.supplyLiquidityBase(
    feePayerAddress,
    UInt64.from(10_000),
    UInt64.from(10_000)
  );
});
await tx.prove();
tx.sign([feePayerKey]);
await tx.send();
[oldBalances, balances] = [balances, getTokenBalances()];
console.log('DEX liquidity (X, Y):', balances.dex.X, balances.dex.Y);

/**
 * SUPPLY LIQUIDITY
 *
 * Happy path (lqXY token was not created for user’s account before)
 *
 * Test Preconditions:
 * - Tokens X and Y created;
 * - Some amount of both tokens minted (balances > 0) and available for user's token account;
 * - Initial liquidity provided to the DEX contract, so that there exists a token X : Y ratio
 *   from which to calculate required liquidity inputs
 */
expect(balances.tokenContract.X).toBeGreaterThan(0n);
expect(balances.tokenContract.Y).toBeGreaterThan(0n);
expect(balances.user.X).toBeGreaterThan(0n);
expect(balances.user.Y).toBeGreaterThan(0n);
expect(balances.total.lqXY).toBeGreaterThan(0n);

/**
 * Actions:
 * - User calls the “Supply Liquidity” smart contract method providing the required tokens
 *   account information (if not derived automatically) and tokens amounts one is willing to supply.
 * - User provides the account creation fee, to be subtracted from its Mina account
 */
let USER_DX = 100n;
console.log('user supply liquidity (1)');
tx = await Mina.transaction(keys.user, () => {
  AccountUpdate.fundNewAccount(keys.user);
  dex.supplyLiquidity(addresses.user, UInt64.from(USER_DX));
});
await tx.prove();
tx.sign([keys.user]);
await tx.send();
[oldBalances, balances] = [balances, getTokenBalances()];
console.log('DEX liquidity (X, Y):', balances.dex.X, balances.dex.Y);
console.log('user DEX tokens:', balances.user.lqXY);
console.log('user MINA:', balances.user.MINA);

/**
 * Expected results:
 * - Smart contract transfers specified amount of tokens from user’s account to SC account.
 *   - Check the balances.
 * - SC mints the “lqXY” tokens in the amount calculated based on the current liquidity pool state
 *   and AMM formula application, consumes the lqXY token creation fee from the user’s default
 *   token account (in parent tokens, which is Mina) and transfers amount of minted lqXY tokens to user’s account;
 */
expect(balances.user.X).toEqual(oldBalances.user.X - USER_DX);
expect(balances.user.Y).toEqual(
  oldBalances.user.Y - (USER_DX * oldBalances.dex.Y) / oldBalances.dex.X
);
expect(balances.user.MINA).toEqual(oldBalances.user.MINA - 1n);
expect(balances.user.lqXY).toEqual(
  (USER_DX * oldBalances.total.lqXY) / oldBalances.dex.X
);

/**
 * Happy path (lqXY token exists for users account)
 *
 * Same case but we are checking that no token creation fee is paid by the liquidity supplier.
 */
console.log('user supply liquidity (2)');
tx = await Mina.transaction(keys.user, () => {
  dex.supplyLiquidity(addresses.user, UInt64.from(USER_DX));
});
await tx.prove();
tx.sign([keys.user]);
await tx.send();
[oldBalances, balances] = [balances, getTokenBalances()];
console.log('DEX liquidity (X, Y):', balances.dex.X, balances.dex.Y);
console.log('user DEX tokens:', balances.user.lqXY);

expect(balances.user.X).toEqual(oldBalances.user.X - USER_DX);
expect(balances.user.Y).toEqual(
  oldBalances.user.Y - (USER_DX * oldBalances.dex.Y) / oldBalances.dex.X
);
expect(balances.user.MINA).toEqual(oldBalances.user.MINA);
expect(balances.user.lqXY).toEqual(
  oldBalances.user.lqXY + (USER_DX * oldBalances.total.lqXY) / oldBalances.dex.X
);

/**
 * REDEEM LIQUIDITY
 *
 * Happy path (no vesting applied)
 *
 * Test Preconditions:
 * - The "Supply Liquidity" happy path case was processed with no vesting period for lqXY tokens applied.
 * - User has some lqXY tokens
 *
 * Actions:
 * - User calls the “Liquidity Redemption” SC method providing the amount of lqXY tokens one is willing to redeem.
 */
let USER_DL = 100n;
console.log('user redeem liquidity');
tx = await Mina.transaction(keys.user, () => {
  dex.redeemLiquidity(addresses.user, UInt64.from(USER_DL));
});
await tx.prove();
tx.sign([keys.user]);
await tx.send();
[oldBalances, balances] = [balances, getTokenBalances()];
console.log('DEX liquidity (X, Y):', balances.dex.X, balances.dex.Y);
console.log('user DEX tokens:', balances.user.lqXY);
console.log('User tokens (X, Y):', balances.user.X, balances.user.Y);

/**
 * Expected results:
 * - Asked amount of lqXY tokens is burned off the user's account;
 *   - Check the balance before and after.
 * - The pool's liquidity will reflect the changes of lqXY tokens supply upon the next "Swap" operation;
 *   - We probably don’t need to check it here?
 * - Calculated amount of X and Y tokens are transferred to user’s tokens accounts;
 *   - Check balances on sender and receiver sides.
 */
expect(balances.user.lqXY).toEqual(oldBalances.user.lqXY - USER_DL);
expect(balances.total.lqXY).toEqual(oldBalances.total.lqXY - USER_DL);
let [dx, dy] = [
  (USER_DL * oldBalances.dex.X) / oldBalances.total.lqXY,
  (USER_DL * oldBalances.dex.Y) / oldBalances.total.lqXY,
];
expect(balances.user.X).toEqual(oldBalances.user.X + dx);
expect(balances.user.Y).toEqual(oldBalances.user.Y + dy);
expect(balances.dex.X).toEqual(oldBalances.dex.X - dx);
expect(balances.dex.Y).toEqual(oldBalances.dex.Y - dy);

console.log('swap 10 X for Y');
tx = await Mina.transaction(keys.user, () => {
  dex.swapX(addresses.user, UInt64.from(10));
});
await tx.prove();
tx.sign([keys.user]);
await tx.send();
[oldBalances, balances] = [balances, getTokenBalances()];
console.log('User tokens (X, Y):', balances.user.X, balances.user.Y);

shutdown();
