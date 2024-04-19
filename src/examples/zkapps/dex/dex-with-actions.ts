/**
 * This DEX implementation differs from ./dex.ts in two ways:
 * - More minimal & realistic; stuff designed only for testing protocol features was removed
 * - Uses an async pattern with actions that lets users claim funds later and reduces account updates
 */
import {
  Account,
  AccountUpdate,
  AccountUpdateForest,
  Field,
  InferProvable,
  Mina,
  Permissions,
  Provable,
  PublicKey,
  Reducer,
  SmartContract,
  State,
  Struct,
  TokenContract,
  TokenId,
  UInt64,
  method,
  state,
} from 'o1js';

import { randomAccounts } from './dex.js';
import { TrivialCoin } from './erc20.js';

export { Dex, DexTokenHolder, addresses, getTokenBalances, keys, tokenIds };

class RedeemAction extends Struct({ address: PublicKey, dl: UInt64 }) {}

class Dex extends TokenContract {
  // addresses of token contracts are constants
  tokenX = addresses.tokenX;
  tokenY = addresses.tokenY;

  // Approvable API

  @method async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  /**
   * state that keeps track of total lqXY supply -- this is needed to calculate what to return when redeeming liquidity
   *
   * total supply is initially zero; it increases when supplying liquidity and decreases when redeeming it
   */
  @state(UInt64) totalSupply = State<UInt64>();

  /**
   * redeeming liquidity is a 2-step process leveraging actions, to get past the account update limit
   */
  reducer = Reducer({ actionType: RedeemAction });

  events = {
    'supply-liquidity': Struct({ address: PublicKey, dx: UInt64, dy: UInt64 }),
    'redeem-liquidity': Struct({ address: PublicKey, dl: UInt64 }),
  };
  // better-typed wrapper for `this.emitEvent()`. TODO: remove after fixing event typing
  get typedEvents() {
    return getTypedEvents<Dex>(this);
  }

  /**
   * Initialization. _All_ permissions are set to impossible except the explicitly required permissions.
   */
  init() {
    super.init();
    let proof = Permissions.proof();
    this.account.permissions.set({
      ...Permissions.allImpossible(),
      access: proof,
      editState: proof,
      editActionState: proof,
      send: proof,
    });
  }

  // TODO this could just use `this.approveAccountUpdate()` instead of a separate @method
  @method async createAccount() {
    this.internal.mint({
      // unconstrained because we don't care which account is created
      address: this.sender.getUnconstrained(),
      amount: UInt64.from(0),
    });
  }

  /**
   * Mint liquidity tokens in exchange for X and Y tokens
   * @param dx input amount of X tokens
   * @param dy input amount of Y tokens
   * @return output amount of lqXY tokens
   *
   * This function fails if the X and Y token amounts don't match the current X/Y ratio in the pool.
   * This can also be used if the pool is empty. In that case, there is no check on X/Y;
   * instead, the input X and Y amounts determine the initial ratio.
   */
  @method.returns(UInt64)
  async supplyLiquidityBase(dx: UInt64, dy: UInt64) {
    // unconstrained because `transfer()` requires sender signature anyway
    let user = this.sender.getUnconstrained();
    let tokenX = new TrivialCoin(this.tokenX);
    let tokenY = new TrivialCoin(this.tokenY);

    // get balances of X and Y token
    let dexX = AccountUpdate.create(this.address, tokenX.deriveTokenId());
    let x = dexX.account.balance.getAndRequireEquals();

    let dexY = AccountUpdate.create(this.address, tokenY.deriveTokenId());
    let y = dexY.account.balance.getAndRequireEquals();

    // // assert dy === [dx * y/x], or x === 0
    let isXZero = x.equals(UInt64.zero);
    let xSafe = Provable.if(isXZero, UInt64.one, x);
    let isDyCorrect = dy.equals(dx.mul(y).div(xSafe));
    isDyCorrect.or(isXZero).assertTrue();

    await tokenX.transfer(user, dexX, dx);
    await tokenY.transfer(user, dexY, dy);

    // calculate liquidity token output simply as dl = dx + dx
    // => maintains ratio x/l, y/l
    let dl = dy.add(dx);
    this.internal.mint({ address: user, amount: dl });

    // update l supply
    let l = this.totalSupply.get();
    this.totalSupply.requireEquals(l);
    this.totalSupply.set(l.add(dl));

    // emit event
    this.typedEvents.emit('supply-liquidity', { address: user, dx, dy });
    return dl;
  }

  /**
   * Mint liquidity tokens in exchange for X and Y tokens
   * @param dx input amount of X tokens
   * @return output amount of lqXY tokens
   *
   * This uses supplyLiquidityBase as the circuit, but for convenience,
   * the input amount of Y tokens is calculated automatically from the X tokens.
   * Fails if the liquidity pool is empty, so can't be used for the first deposit.
   */
  async supplyLiquidity(dx: UInt64) {
    // calculate dy outside circuit
    let x = Mina.getAccount(this.address, TokenId.derive(this.tokenX)).balance;
    let y = Mina.getAccount(this.address, TokenId.derive(this.tokenY)).balance;
    if (x.value.isConstant() && x.value.equals(0).toBoolean()) {
      throw Error(
        'Cannot call `supplyLiquidity` when reserves are zero. Use `supplyLiquidityBase`.'
      );
    }
    let dy = dx.mul(y).div(x);
    return await this.supplyLiquidityBase(dx, dy);
  }

  /**
   * Burn liquidity tokens to get back X and Y tokens
   * @param dl input amount of lqXY token
   *
   * The transaction needs to be signed by the user's private key.
   *
   * NOTE: this does not give back tokens in return for liquidity right away.
   * to get back the tokens, you have to call {@link DexTokenHolder}.redeemFinalize()
   * on both token holder contracts, after `redeemInitialize()` has been accepted into a block.
   *
   * @emits RedeemAction - action on the Dex account that will make the token holder
   * contracts pay you tokens when reducing the action.
   */
  @method async redeemInitialize(dl: UInt64) {
    let sender = this.sender.getUnconstrained(); // unconstrained because `burn()` requires sender signature anyway
    this.reducer.dispatch(new RedeemAction({ address: sender, dl }));
    this.internal.burn({ address: sender, amount: dl });
    // TODO: preconditioning on the state here ruins concurrent interactions,
    // there should be another `finalize` DEX method which reduces actions & updates state
    this.totalSupply.set(this.totalSupply.getAndRequireEquals().sub(dl));

    // emit event
    this.typedEvents.emit('redeem-liquidity', { address: sender, dl });
  }

  /**
   * Helper for `DexTokenHolder.redeemFinalize()` which adds preconditions on
   * the current action state and token supply
   */
  @method async assertActionsAndSupply(
    actionState: Field,
    totalSupply: UInt64
  ) {
    this.account.actionState.requireEquals(actionState);
    this.totalSupply.requireEquals(totalSupply);
  }

  /**
   * Swap X tokens for Y tokens
   * @param dx input amount of X tokens
   * @return output amount Y tokens
   *
   * The transaction needs to be signed by the user's private key.
   *
   * Note: this is not a `@method`, since it doesn't do anything beyond
   * the called methods which requires proof authorization.
   */
  async swapX(dx: UInt64) {
    let user = this.sender.getUnconstrained(); // unconstrained because `swap()` requires sender signature anyway
    let tokenY = new TrivialCoin(this.tokenY);
    let dexY = new DexTokenHolder(this.address, tokenY.deriveTokenId());
    let dy = await dexY.swap(user, dx, this.tokenX);
    await tokenY.transfer(dexY.self, user, dy);
    return dy;
  }

  /**
   * Swap Y tokens for X tokens
   * @param dy input amount of Y tokens
   * @return output amount Y tokens
   *
   * The transaction needs to be signed by the user's private key.
   *
   * Note: this is not a `@method`, since it doesn't do anything beyond
   * the called methods which requires proof authorization.
   */
  async swapY(dy: UInt64) {
    let user = this.sender.getUnconstrained(); // unconstrained because `swap()` requires sender signature anyway
    let tokenX = new TrivialCoin(this.tokenX);
    let dexX = new DexTokenHolder(this.address, tokenX.deriveTokenId());
    let dx = await dexX.swap(user, dy, this.tokenY);
    await tokenX.transfer(dexX.self, user, dx);
    return dx;
  }
}

class DexTokenHolder extends SmartContract {
  @state(Field) redeemActionState = State<Field>();
  static redeemActionBatchSize = 5;

  events = {
    swap: Struct({ address: PublicKey, dx: UInt64 }),
  };
  // better-typed wrapper for `this.emitEvent()`. TODO: remove after fixing event typing
  get typedEvents() {
    return getTypedEvents<DexTokenHolder>(this);
  }

  init() {
    super.init();
    this.redeemActionState.set(Reducer.initialActionState);
  }

  @method async redeemLiquidityFinalize() {
    // get redeem actions
    let dex = new Dex(this.address);
    let fromActionState = this.redeemActionState.getAndRequireEquals();
    let actions = dex.reducer.getActions({ fromActionState });

    // get total supply of liquidity tokens _before_ applying these actions
    // (each redeem action _decreases_ the supply, so we increase it here)
    let l = Provable.witness(UInt64, () => {
      let l = dex.totalSupply.get().toBigInt();
      // dex.totalSupply.assertNothing();
      for (let action of actions.data.get()) {
        l += action.element.data.get()[0].element.dl.toBigInt();
      }
      return l;
    });

    // get our token balance
    let x = this.account.balance.getAndRequireEquals();

    dex.reducer.forEach(
      actions,
      ({ address, dl }) => {
        // for every user that redeemed liquidity, we calculate the token output
        // and create a child account update which pays the user
        let dx = x.mul(dl).div(l);
        let receiver = this.send({ to: address, amount: dx });
        // note: this should just work when the reducer gives us dummy data

        // important: these child account updates inherit token permission from us
        receiver.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;

        // update l and x accordingly
        l = l.sub(dl);
        x = x.add(dx);
      },
      {
        maxUpdatesWithActions: DexTokenHolder.redeemActionBatchSize,
        // DEX contract doesn't allow setting preconditions from outside (= w/o proof)
        skipActionStatePrecondition: true,
      }
    );

    // update action state so these payments can't be triggered a 2nd time
    this.redeemActionState.set(actions.hash);

    // precondition on the DEX contract, to prove we used the right actions & token supply
    await dex.assertActionsAndSupply(actions.hash, l);
  }

  // this works for both directions (in our case where both tokens use the same contract)
  @method.returns(UInt64)
  async swap(
    user: PublicKey,
    otherTokenAmount: UInt64,
    otherTokenAddress: PublicKey
  ) {
    // we're writing this as if our token === y and other token === x
    let dx = otherTokenAmount;
    let tokenX = new TrivialCoin(otherTokenAddress);

    // get balances of X and Y token
    let dexX = AccountUpdate.create(this.address, tokenX.deriveTokenId());
    let x = dexX.account.balance.getAndRequireEquals();
    let y = this.account.balance.getAndRequireEquals();

    // send x from user to us (i.e., to the same address as this but with the other token)
    await tokenX.transfer(user, dexX, dx);

    // compute and send dy
    let dy = y.mul(dx).div(x.add(dx));
    // just subtract dy balance and let adding balance be handled one level higher
    this.balance.subInPlace(dy);

    // emit event
    this.typedEvents.emit('swap', { address: user, dx });

    return dy;
  }
}

let { keys, addresses } = randomAccounts(
  process.env.USE_CUSTOM_LOCAL_NETWORK === 'true',
  'tokenX',
  'tokenY',
  'dex',
  'user'
);
let tokenIds = {
  X: TokenId.derive(addresses.tokenX),
  Y: TokenId.derive(addresses.tokenY),
  lqXY: TokenId.derive(addresses.dex),
};

/**
 * Helper to get the various token balances for checks in tests
 */
function getTokenBalances() {
  let balances = {
    user: { MINA: 0n, X: 0n, Y: 0n, lqXY: 0n },
    dex: { X: 0n, Y: 0n, lqXYSupply: 0n },
  };
  for (let user of ['user'] as const) {
    try {
      balances[user].MINA =
        Mina.getBalance(addresses[user]).toBigInt() / 1_000_000_000n;
    } catch {}
    for (let token of ['X', 'Y', 'lqXY'] as const) {
      try {
        balances[user][token] = Mina.getBalance(
          addresses[user],
          tokenIds[token]
        ).toBigInt();
      } catch {}
    }
  }
  try {
    balances.dex.X = Mina.getBalance(addresses.dex, tokenIds.X).toBigInt();
  } catch {}
  try {
    balances.dex.Y = Mina.getBalance(addresses.dex, tokenIds.Y).toBigInt();
  } catch {}
  try {
    let dex = new Dex(addresses.dex);
    balances.dex.lqXYSupply = dex.totalSupply.get().toBigInt();
  } catch {}
  return balances;
}

function getTypedEvents<Contract extends SmartContract>(contract: Contract) {
  return {
    emit<Key extends keyof Contract['events']>(
      key: Key,
      event: InferProvable<Contract['events'][Key]>
    ) {
      contract.emitEvent(key, event);
    },
  };
}
