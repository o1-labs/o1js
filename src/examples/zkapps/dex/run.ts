import { expect } from 'expect';
import { AccountUpdate, Mina, Permissions, TokenId, UInt64 } from 'o1js';
import { getProfiler } from '../../utils/profiler.js';
import { TokenContract, addresses, createDex, keys, tokenIds } from './dex.js';

let proofsEnabled = false;
let Local = await Mina.LocalBlockchain({
  proofsEnabled,
  enforceTransactionLimits: false,
});
Mina.setActiveInstance(Local);
let [feePayer] = Local.testAccounts;
let tx, balances, oldBalances;

console.log('-------------------------------------------------');
console.log('FEE PAYER\t', feePayer.toBase58());
console.log('TOKEN X ADDRESS\t', addresses.tokenX.toBase58());
console.log('TOKEN Y ADDRESS\t', addresses.tokenY.toBase58());
console.log('DEX ADDRESS\t', addresses.dex.toBase58());
console.log('USER ADDRESS\t', addresses.user.toBase58());
console.log('-------------------------------------------------');
console.log('TOKEN X ID\t', TokenId.toBase58(tokenIds.X));
console.log('TOKEN Y ID\t', TokenId.toBase58(tokenIds.Y));
console.log('-------------------------------------------------');

await TokenContract.analyzeMethods();
if (proofsEnabled) {
  console.log('compile (token)...');
  await TokenContract.compile();
}

await main({ withVesting: false });

// swap out ledger so we can start fresh
Local = await Mina.LocalBlockchain({
  proofsEnabled,
  enforceTransactionLimits: false,
});
Mina.setActiveInstance(Local);
feePayer = Local.testAccounts[0];

await main({ withVesting: true });

console.log('all dex tests were successful! 🎉');

async function main({ withVesting }: { withVesting: boolean }) {
  const DexProfiler = getProfiler(
    `DEX testing ${withVesting ? 'with vesting' : ''}`
  );
  DexProfiler.start('DEX test flow');
  if (withVesting) console.log('\nWITH VESTING');
  else console.log('\nNO VESTING');

  let options = withVesting ? { lockedLiquiditySlots: 2 } : undefined;
  let { Dex, DexTokenHolder, getTokenBalances } = createDex(options);

  // analyze methods for quick error feedback
  await DexTokenHolder.analyzeMethods();
  await Dex.analyzeMethods();

  if (proofsEnabled) {
    // compile & deploy all zkApps
    console.log('compile (dex token holder)...');
    await DexTokenHolder.compile();
    console.log('compile (dex main contract)...');
    await Dex.compile();
  }

  let tokenX = new TokenContract(addresses.tokenX);
  let tokenY = new TokenContract(addresses.tokenY);
  let dex = new Dex(addresses.dex);
  let dexTokenHolderX = new DexTokenHolder(addresses.dex, tokenIds.X);
  let dexTokenHolderY = new DexTokenHolder(addresses.dex, tokenIds.Y);

  console.log('deploy & init token contracts...');
  tx = await Mina.transaction(feePayer, async () => {
    await tokenX.deploy();
    await tokenY.deploy();

    // pay fees for creating 2 token contract accounts, and fund them so each can create 1 account themselves
    const accountFee = Mina.getNetworkConstants().accountCreationFee;
    let feePayerUpdate = AccountUpdate.fundNewAccount(feePayer, 2);
    feePayerUpdate.send({ to: tokenX.self, amount: accountFee.mul(2) });
    feePayerUpdate.send({ to: tokenY.self, amount: accountFee.mul(2) });
  });
  await tx.prove();
  tx.sign([feePayer.key, keys.tokenX, keys.tokenY]);
  await tx.send();
  balances = getTokenBalances();
  console.log(
    'Token contract tokens (X, Y):',
    balances.tokenContract.X,
    balances.tokenContract.Y
  );

  console.log('deploy dex contracts...');
  tx = await Mina.transaction(feePayer, async () => {
    // pay fees for creating 3 dex accounts
    AccountUpdate.fundNewAccount(feePayer, 3);
    await dex.deploy();
    await dexTokenHolderX.deploy();
    await tokenX.approveAccountUpdate(dexTokenHolderX.self);
    await dexTokenHolderY.deploy();
    await tokenY.approveAccountUpdate(dexTokenHolderY.self);
  });
  await tx.prove();
  tx.sign([feePayer.key, keys.dex]);
  await tx.send();

  console.log('transfer tokens to user');
  tx = await Mina.transaction(
    {
      sender: feePayer,
      fee: Mina.getNetworkConstants().accountCreationFee.mul(1),
    },
    async () => {
      let au = AccountUpdate.fundNewAccount(feePayer, 4);
      au.send({ to: addresses.user, amount: 20e9 }); // give users MINA to pay fees
      au.send({ to: addresses.user2, amount: 20e9 });
      // transfer to fee payer so they can provide initial liquidity
      await tokenX.transfer(addresses.tokenX, feePayer, 10_000);
      await tokenY.transfer(addresses.tokenY, feePayer, 10_000);
      // mint tokens to the user (this is additional to the tokens minted at the beginning, so we can overflow the balance
      await tokenX.init2();
      await tokenY.init2();
    }
  );
  await tx.prove();
  tx.sign([feePayer.key, keys.tokenX, keys.tokenY]);
  await tx.send();
  [oldBalances, balances] = [balances, getTokenBalances()];
  console.log('User tokens (X, Y):', balances.user.X, balances.user.Y);
  console.log('User MINA:', balances.user.MINA);

  // supply the initial liquidity where the token ratio can be arbitrary
  console.log('supply liquidity -- base');
  tx = await Mina.transaction(
    {
      sender: feePayer,
      fee: Mina.getNetworkConstants().accountCreationFee,
    },
    async () => {
      AccountUpdate.fundNewAccount(feePayer);
      await dex.supplyLiquidityBase(UInt64.from(10_000), UInt64.from(10_000));
    }
  );
  await tx.prove();
  tx.sign([feePayer.key]);
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
  tx = await Mina.transaction(addresses.user, async () => {
    AccountUpdate.fundNewAccount(addresses.user);
    await dex.supplyLiquidity(UInt64.from(USER_DX));
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
  tx = await Mina.transaction(addresses.user, async () => {
    await dex.supplyLiquidity(UInt64.from(USER_DX));
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
    await expect(tx.send()).rejects.toThrow(/Update_not_permitted_timing/);
  }

  /**
   * Check the method failures during an attempts to supply liquidity when:
   * - There is no token X or Y (or both) created yet for user’s account;
   * - There is not enough tokens available for user’s tokens accounts, one is willing to supply;
   */
  console.log('supplying with no tokens (should fail)');
  tx = await Mina.transaction(addresses.user2, async () => {
    AccountUpdate.fundNewAccount(addresses.user2);
    await dex.supplyLiquidityBase(UInt64.from(100), UInt64.from(100));
  });
  await tx.prove();
  tx.sign([keys.user2]);
  await expect(tx.send()).rejects.toThrow(/Overflow/);
  console.log('supplying with insufficient tokens (should fail)');
  tx = await Mina.transaction(addresses.user, async () => {
    await dex.supplyLiquidityBase(UInt64.from(1e9), UInt64.from(1e9));
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
  tx = await Mina.transaction(feePayer, async () => {
    AccountUpdate.fundNewAccount(feePayer);
    await tokenY.transfer(
      addresses.tokenY,
      addresses.tokenX,
      UInt64.MAXINT().sub(200_000)
    );
  });
  await tx.prove();
  await tx.sign([feePayer.key, keys.tokenY]).send();
  console.log('supply overflowing liquidity');
  await expect(async () => {
    tx = await Mina.transaction(addresses.tokenX, async () => {
      await dex.supplyLiquidityBase(
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
  tx = await Mina.transaction(addresses.tokenX, async () => {
    let tokenXtokenAccount = AccountUpdate.create(addresses.tokenX, tokenIds.X);
    tokenXtokenAccount.account.permissions.set({
      ...Permissions.initial(),
      send: Permissions.impossible(),
    });
    tokenXtokenAccount.requireSignature();
    // token X owner approves w/ signature so we don't need another method for this test
    let tokenX = AccountUpdate.create(addresses.tokenX);
    tokenX.approve(tokenXtokenAccount);
    tokenX.requireSignature();
  });
  await tx.prove();
  await tx.sign([keys.tokenX]).send();
  console.log('supply with forbidden withdrawal (should fail)');
  tx = await Mina.transaction(addresses.tokenX, async () => {
    AccountUpdate.fundNewAccount(addresses.tokenX);
    await dex.supplyLiquidity(UInt64.from(10));
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
    tx = await Mina.transaction(addresses.user, async () => {
      await dex.redeemLiquidity(UInt64.from(USER_DL));
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
  tx = await Mina.transaction(addresses.user, async () => {
    await dex.redeemLiquidity(UInt64.from(USER_DL));
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
    tx = await Mina.transaction(addresses.user, async () => {
      await dex.supplyLiquidity(UInt64.from(USER_DX));
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
  if (withVesting) {
    DexProfiler.stop().store();
    return;
  }

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
  tx = await Mina.transaction(addresses.user, async () => {
    AccountUpdate.fundNewAccount(addresses.user);
    await dex.transfer(addresses.user, addresses.user2, UInt64.from(USER_DL));
  });
  await tx.prove();
  await tx.sign([keys.user]).send();
  [oldBalances, balances] = [balances, getTokenBalances()];

  console.log(
    'redeem liquidity with both users in one tx (fails because of conflicting balance preconditions)'
  );
  tx = await Mina.transaction(addresses.user2, async () => {
    AccountUpdate.createSigned(addresses.user2).balance.subInPlace(
      Mina.getNetworkConstants().accountCreationFee.mul(2)
    );
    await dex.redeemLiquidity(UInt64.from(USER_DL));
    await dex.redeemLiquidity(UInt64.from(USER_DL));
  });
  await tx.prove();
  tx.sign([keys.user, keys.user2]);
  await expect(tx.send()).rejects.toThrow(
    /Account_balance_precondition_unsatisfied/
  );

  console.log('user2 redeem liquidity');
  tx = await Mina.transaction(addresses.user2, async () => {
    AccountUpdate.createSigned(addresses.user2).balance.subInPlace(
      Mina.getNetworkConstants().accountCreationFee.mul(2)
    );
    await dex.redeemLiquidity(UInt64.from(USER_DL));
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
  tx = await Mina.transaction(addresses.user2, async () => {
    await dex.redeemLiquidity(UInt64.from(1n));
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
  tx = await Mina.transaction(addresses.user, async () => {
    await dex.swapX(UInt64.from(USER_DX));
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
   *   the zkApps/o1js on/off-chain features, not the current application's logic;
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

  DexProfiler.stop().store();
}
