import {
  isReady,
  Mina,
  AccountUpdate,
  UInt64,
  shutdown,
  Token,
  Permissions,
} from 'snarkyjs';
import { createDex, TokenContract, addresses, keys, tokenIds } from './dex.js';
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

console.log('compile (token)...');
await TokenContract.compile();

await main({ withVesting: false });

// swap out ledger so we can start fresh
Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
Mina.setActiveInstance(Local);
[{ privateKey: feePayerKey }] = Local.testAccounts;
feePayerAddress = feePayerKey.toPublicKey();

await main({ withVesting: true });
console.log('all dex tests were successful! 🎉');

async function main({ withVesting }: { withVesting: boolean }) {
  if (withVesting) console.log('\nWITH VESTING');
  else console.log('\nNO VESTING');

  let options = withVesting ? { lockedLiquiditySlots: 2 } : undefined;
  let { Dex, DexTokenHolder, getTokenBalances } = createDex(options);

  // analyze methods for quick error feedback
  DexTokenHolder.analyzeMethods();
  Dex.analyzeMethods();

  // compile & deploy all zkApps
  console.log('compile (dex token holder)...');
  await DexTokenHolder.compile();
  console.log('compile (dex main contract)...');
  await Dex.compile();

  let tokenX = new TokenContract(addresses.tokenX);
  let tokenY = new TokenContract(addresses.tokenY);
  let dex = new Dex(addresses.dex);

  console.log('deploy & init token contracts...');
  tx = await Mina.transaction({ feePayerKey }, () => {
    // pay fees for creating 2 token contract accounts, and fund them so each can create 2 accounts themselves
    let feePayerUpdate = AccountUpdate.createSigned(feePayerKey);
    feePayerUpdate.balance.subInPlace(accountFee.mul(2));
    feePayerUpdate.send({ to: addresses.tokenX, amount: accountFee.mul(2) });
    feePayerUpdate.send({ to: addresses.tokenY, amount: accountFee.mul(2) });
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
    AccountUpdate.createSigned(feePayerKey).balance.subInPlace(
      accountFee.mul(3)
    );
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
    feePayer.balance.subInPlace(Mina.accountCreationFee().mul(4));
    feePayer.send({ to: addresses.user, amount: 20e9 }); // give users MINA to pay fees
    feePayer.send({ to: addresses.user2, amount: 20e9 });
    // transfer to fee payer so they can provide initial liquidity
    tokenX.transfer(addresses.tokenX, feePayerAddress, UInt64.from(10_000));
    tokenY.transfer(addresses.tokenY, feePayerAddress, UInt64.from(10_000));
    // mint tokens to the user (this is additional to the tokens minted at the beginning, so we can overflow the balance
    tokenX.init2();
    tokenY.init2();
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
   *
   * note: we supply much more liquidity here, so we can exercise the overflow failure case after that
   */
  let USER_DX = 500_000n;
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
   *
   * Note: with vesting, this is a failure case because we can't change timing on an account that currently has an active timing
   */
  USER_DX = 1000n;
  console.log('user supply liquidity (2)');
  tx = await Mina.transaction(keys.user, () => {
    dex.supplyLiquidity(addresses.user, UInt64.from(USER_DX));
  });
  await tx.prove();
  tx.sign([keys.user]);
  if (!withVesting) {
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
      oldBalances.user.lqXY +
        (USER_DX * oldBalances.total.lqXY) / oldBalances.dex.X
    );
  } else {
    await expect(tx.send()).rejects.toThrow(
      /Update_not_permitted_timing_existing_account/
    );
  }

  /**
   * Check the method failures during an attempts to supply liquidity when:
   * - There is no token X or Y (or both) created yet for user’s account;
   * - There is not enough tokens available for user’s tokens accounts, one is willing to supply;
   */
  console.log('supplying with no tokens (should fail)');
  tx = await Mina.transaction(keys.user2, () => {
    AccountUpdate.fundNewAccount(keys.user2);
    dex.supplyLiquidityBase(
      addresses.user2,
      UInt64.from(100),
      UInt64.from(100)
    );
  });
  await tx.prove();
  tx.sign([keys.user2]);
  await expect(tx.send()).rejects.toThrow(/Overflow/);
  console.log('supplying with insufficient tokens (should fail)');
  tx = await Mina.transaction(keys.user, () => {
    dex.supplyLiquidityBase(addresses.user, UInt64.from(1e9), UInt64.from(1e9));
  });
  await tx.prove();
  tx.sign([keys.user]);
  await expect(tx.send()).rejects.toThrow(/Overflow/);

  /**
   * - Resulting operation will overflow the SC’s receiving token by type or by any other applicable limits;
   *
   * note: this throws not at the protocol level, but because the smart contract multiplies two UInt64s which overflow.
   * this happens in all DEX contract methods!
   * => a targeted test with explicitly constructed account updates might be the better strategy to test overflow
   */
  console.log('prepare supplying overflowing liquidity');
  tx = await Mina.transaction(feePayerKey, () => {
    AccountUpdate.fundNewAccount(feePayerKey);
    tokenY.transfer(
      addresses.tokenY,
      addresses.tokenX,
      UInt64.MAXINT().sub(200_000)
    );
  });
  await tx.prove();
  await tx.sign([keys.tokenY]).send();
  console.log('supply overflowing liquidity');
  await expect(async () => {
    tx = await Mina.transaction(feePayerKey, () => {
      dex.supplyLiquidityBase(
        addresses.tokenX,
        UInt64.MAXINT().sub(200_000),
        UInt64.MAXINT().sub(200_000)
      );
    });
    await tx.prove();
    tx.sign([keys.tokenX]);
    await tx.send();
  }).rejects.toThrow();

  /**
   * - Value transfer is restricted (supplier end: withdrawal is prohibited, receiver end: receiving is prohibited) for one or both accounts.
   */
  console.log('prepare test with forbidden send');
  tx = await Mina.transaction(keys.tokenX, () => {
    let tokenXtokenAccount = AccountUpdate.create(addresses.tokenX, tokenIds.X);
    AccountUpdate.setValue(tokenXtokenAccount.update.permissions, {
      ...Permissions.initial(),
      send: Permissions.impossible(),
    });
    tokenXtokenAccount.sign();
    // token X owner approves w/ signature so we don't need another method for this test
    let tokenX = AccountUpdate.create(addresses.tokenX);
    tokenX.approve(tokenXtokenAccount);
    tokenX.sign();
  });
  await tx.prove();
  await tx.sign([keys.tokenX]).send();
  console.log('supply with forbidden withdrawal (should fail)');
  tx = await Mina.transaction(keys.tokenX, () => {
    AccountUpdate.fundNewAccount(feePayerKey);
    dex.supplyLiquidity(addresses.tokenX, UInt64.from(10));
  });
  await tx.prove();
  await expect(tx.sign([keys.tokenX]).send()).rejects.toThrow(
    /Update_not_permitted_balance/
  );

  [oldBalances, balances] = [balances, getTokenBalances()];

  /**
   * REDEEM LIQUIDITY
   */
  if (withVesting) {
    /**
     * Happy path (vesting period applied)
     * - Same case but this time the “Supply Liquidity” happy path case was processed with vesting period
     *   applied for lqXY tokens. We’re checking that it is impossible to redeem lqXY tokens without respecting
     *   the timing first and then we check that tokens can be redeemed once timing conditions are met.
     */

    // liquidity is locked for 2 slots
    // step forward 1 slot => liquidity not unlocked yet
    Local.incrementGlobalSlot(1);
    let USER_DL = 100n;
    console.log('user redeem liquidity (before liquidity token unlocks)');
    tx = await Mina.transaction(keys.user, () => {
      dex.redeemLiquidity(addresses.user, UInt64.from(USER_DL));
    });
    await tx.prove();
    tx.sign([keys.user]);
    await expect(tx.send()).rejects.toThrow(/Source_minimum_balance_violation/);

    // another slot => now it should work
    Local.incrementGlobalSlot(1);
  }
  /**
   * Happy path (no vesting applied)
   *
   * Test Preconditions:
   * - The "Supply Liquidity" happy path case was processed with no vesting period for lqXY tokens applied.
   * - User has some lqXY tokens
   *
   * Actions:
   * - User calls the “Liquidity Redemption” SC method providing the amount of lqXY tokens one is willing to redeem.
   *
   * Note: we reuse this logic for successful redemption in the vesting case
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

  /**
   * Bonus test (supply liquidity): check that now that the lock period is over, we can supply liquidity again
   */
  if (withVesting) {
    USER_DX = 1000n;
    console.log('user supply liquidity -- again, after lock period ended');
    tx = await Mina.transaction(keys.user, () => {
      dex.supplyLiquidity(addresses.user, UInt64.from(USER_DX));
    });
    await tx.prove();
    await tx.sign([keys.user]).send();
    [oldBalances, balances] = [balances, getTokenBalances()];
    console.log('User tokens (X, Y):', balances.user.X, balances.user.Y);
    expect(balances.user.X).toEqual(oldBalances.user.X - USER_DX);
    expect(balances.user.Y).toEqual(
      oldBalances.user.Y - (USER_DX * oldBalances.dex.Y) / oldBalances.dex.X
    );
  }
  // tests below are not specific to vesting
  if (withVesting) return;

  /**
   * Happy path (tokens creation on receiver side in case of their absence)
   * - Same case but we are checking that one of the tokens will be created for the user
   *   (including fee payment for token creation) in case when it doesn’t exist yet.
   *
   * Check the method failures during an attempts to redeem lqXY tokens when:
   * - Emulate conflicting balance preconditions due to concurrent user interactions
   *   by packing multiple redemptions into one transaction
   *
   * note: we transfer some lqXY tokens from `user` to `user2`, then we try to redeem the with both users
   * -- which exercises a failure case -- and then redeem them all with `user2` (creating their token accounts)
   */
  USER_DL = 80n;
  console.log('transfer liquidity tokens to user2');
  tx = await Mina.transaction(keys.user, () => {
    AccountUpdate.fundNewAccount(keys.user);
    dex.transfer(addresses.user, addresses.user2, UInt64.from(USER_DL));
  });
  await tx.prove();
  await tx.sign([keys.user]).send();
  [oldBalances, balances] = [balances, getTokenBalances()];

  console.log(
    'redeem liquidity with both users in one tx (fails because of conflicting balance preconditions)'
  );
  tx = await Mina.transaction(keys.user2, () => {
    AccountUpdate.createSigned(keys.user2).balance.subInPlace(
      accountFee.mul(2)
    );
    dex.redeemLiquidity(addresses.user, UInt64.from(USER_DL));
    dex.redeemLiquidity(addresses.user2, UInt64.from(USER_DL));
  });
  await tx.prove();
  tx.sign([keys.user, keys.user2]);
  await expect(tx.send()).rejects.toThrow(
    /Account_balance_precondition_unsatisfied/
  );

  console.log('user2 redeem liquidity');
  tx = await Mina.transaction(keys.user2, () => {
    AccountUpdate.createSigned(keys.user2).balance.subInPlace(
      accountFee.mul(2)
    );
    dex.redeemLiquidity(addresses.user2, UInt64.from(USER_DL));
  });
  await tx.prove();
  await tx.sign([keys.user2]).send();
  [oldBalances, balances] = [balances, getTokenBalances()];

  expect(balances.user2.lqXY).toEqual(oldBalances.user2.lqXY - USER_DL);
  [dx, dy] = [
    (USER_DL * oldBalances.dex.X) / oldBalances.total.lqXY,
    (USER_DL * oldBalances.dex.Y) / oldBalances.total.lqXY,
  ];
  expect(balances.user2.X).toEqual(oldBalances.user2.X + dx);
  expect(balances.user2.Y).toEqual(oldBalances.user2.Y + dy);
  expect(balances.user2.MINA).toEqual(oldBalances.user2.MINA - 2n);

  /**
   * Check the method failures during an attempts to redeem lqXY tokens when:
   * - There is not enough lqXY tokens available for user’s account;
   *
   * note: user2's account is empty now, so redeeming more liquidity fails
   */
  console.log('user2 redeem liquidity (fails because insufficient balance)');
  tx = await Mina.transaction(keys.user2, () => {
    dex.redeemLiquidity(addresses.user2, UInt64.from(1n));
  });
  await tx.prove();
  await expect(tx.sign([keys.user2]).send()).rejects.toThrow(/Overflow/);
  [oldBalances, balances] = [balances, getTokenBalances()];

  /**
   * SWAP
   *
   * Happy path (both tokens (X and Y) were created for user)
   *
   * Test Preconditions:
   * - User has token accounts;
   * - Balance of token X is > 0
   * - Liquidity Pool is capable of covering the Swap operation.
   *
   * Actions:
   * - User calls the “Swap” SC method providing the token (X for example) and amount it wants to swap.
   */
  USER_DX = 10n;
  console.log('swap 10 X for Y');
  tx = await Mina.transaction(keys.user, () => {
    dex.swapX(addresses.user, UInt64.from(USER_DX));
  });
  await tx.prove();
  await tx.sign([keys.user]).send();
  [oldBalances, balances] = [balances, getTokenBalances()];
  console.log('User tokens (X, Y):', balances.user.X, balances.user.Y);
  /**
   * Expected results:
   * - SC calculates (using AMM formula and current pool state) the resulting amount of Y token user should receive as the result of the Swap operation;
   * - SC withdraws requested amount of X token from user’s account;
   * - SC sends to user previously calculated amount of Y tokens;
   * - It will be good to check if calculation was done correctly but correctness is not a major concern since we’re checking
   *   the zkApps/SnarkyJS on/off-chain features, not the current application's logic;
   *   We're checking the balances of both tokens on caller and SC sides.
   */
  dy = (USER_DX * oldBalances.dex.Y) / (oldBalances.dex.X + USER_DX);
  expect(balances.user.X).toEqual(oldBalances.user.X - USER_DX);
  expect(balances.user.Y).toEqual(oldBalances.user.Y + dy);
  expect(balances.dex.X).toEqual(oldBalances.dex.X + USER_DX);
  expect(balances.dex.Y).toEqual(oldBalances.dex.Y - dy);
  // x*y is increasing (the dex doesn't lose money from rounding errors -- the user does)
  expect(balances.dex.X * balances.dex.Y).toBeGreaterThanOrEqual(
    oldBalances.dex.X * oldBalances.dex.Y
  );
}

shutdown();
