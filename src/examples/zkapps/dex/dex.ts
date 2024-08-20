import {
  Account,
  AccountUpdate,
  Bool,
  Mina,
  PrivateKey,
  Provable,
  PublicKey,
  SmartContract,
  State,
  Struct,
  TokenId,
  UInt32,
  UInt64,
  method,
  state,
  TokenContract as BaseTokenContract,
  AccountUpdateForest,
} from 'o1js';

export { TokenContract, addresses, createDex, keys, randomAccounts, tokenIds };

class UInt64x2 extends Struct({ values: [UInt64, UInt64] }) {}

function createDex({
  lockedLiquiditySlots,
}: { lockedLiquiditySlots?: number } = {}) {
  class Dex extends BaseTokenContract {
    // addresses of token contracts are constants
    tokenX = addresses.tokenX;
    tokenY = addresses.tokenY;

    // Approvable API

    @method
    async approveBase(forest: AccountUpdateForest) {
      this.checkZeroBalanceChange(forest);
    }

    /**
     * state which keeps track of total lqXY supply -- this is needed to calculate what to return when redeeming liquidity
     *
     * total supply is zero initially; it increases when supplying liquidity and decreases when redeeming it
     */
    @state(UInt64) totalSupply = State<UInt64>();

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
      let user = this.sender.getUnconstrained(); // unconstrained because transfer() requires the signature anyway
      let tokenX = new TokenContract(this.tokenX);
      let tokenY = new TokenContract(this.tokenY);

      // get balances of X and Y token
      let dexXUpdate = AccountUpdate.create(
        this.address,
        tokenX.deriveTokenId()
      );
      let dexXBalance = dexXUpdate.account.balance.getAndRequireEquals();

      let dexYUpdate = AccountUpdate.create(
        this.address,
        tokenY.deriveTokenId()
      );
      let dexYBalance = dexYUpdate.account.balance.getAndRequireEquals();

      // assert dy === [dx * y/x], or x === 0
      let isXZero = dexXBalance.equals(UInt64.zero);
      let xSafe = Provable.if(isXZero, UInt64.one, dexXBalance);
      let isDyCorrect = dy.equals(dx.mul(dexYBalance).div(xSafe));
      isDyCorrect.or(isXZero).assertTrue();

      await tokenX.transfer(user, dexXUpdate, dx);
      await tokenY.transfer(user, dexYUpdate, dy);

      // calculate liquidity token output simply as dl = dx + dy
      // => maintains ratio x/l, y/l
      let dl = dy.add(dx);
      let userUpdate = this.internal.mint({ address: user, amount: dl });
      if (lockedLiquiditySlots !== undefined) {
        /**
         * exercise the "timing" (vesting) feature to lock the received liquidity tokens.
         *
         * THIS IS HERE FOR TESTING!
         *
         * In reality, the timing feature is a bit awkward to use for time-locking liquidity tokens.
         * That's because, if there is currently a vesting schedule on an account, we can't modify it.
         * Thus, a liquidity provider would need to wait for their current tokens to unlock before being able to
         * supply liquidity again (or, create another account to supply liquidity from).
         */
        let amountLocked = dl;
        userUpdate.account.timing.set({
          initialMinimumBalance: amountLocked,
          cliffAmount: amountLocked,
          cliffTime: UInt32.from(lockedLiquiditySlots),
          vestingIncrement: UInt64.zero,
          vestingPeriod: UInt32.one,
        });
        userUpdate.requireSignature();
      }

      // update l supply
      let l = this.totalSupply.get();
      this.totalSupply.requireEquals(l);
      this.totalSupply.set(l.add(dl));
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
      let x = Mina.getAccount(
        this.address,
        TokenId.derive(this.tokenX)
      ).balance;
      let y = Mina.getAccount(
        this.address,
        TokenId.derive(this.tokenY)
      ).balance;
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
     * @return output amount of X and Y tokens, as a tuple [outputX, outputY]
     *
     * The transaction needs to be signed by the user's private key.
     *
     * Note: this is not a `@method` because there's nothing to prove which isn't already proven
     * by the called methods
     */
    async redeemLiquidity(dl: UInt64) {
      // call the token X holder inside a token X-approved callback
      let sender = this.sender.getUnconstrained(); // unconstrained because redeemLiquidity() requires the signature anyway
      let tokenX = new TokenContract(this.tokenX);
      let dexX = new DexTokenHolder(this.address, tokenX.deriveTokenId());
      let { values: dxdy } = await dexX.redeemLiquidity(
        sender,
        dl,
        this.tokenY
      );
      let dx = dxdy[0];
      await tokenX.transfer(dexX.self, sender, dx);
      return dxdy;
    }

    /**
     * Swap X tokens for Y tokens
     * @param dx input amount of X tokens
     * @return output amount Y tokens
     *
     * The transaction needs to be signed by the user's private key.
     */
    @method.returns(UInt64)
    async swapX(dx: UInt64) {
      let sender = this.sender.getUnconstrained(); // unconstrained because swap() requires the signature anyway
      let tokenY = new TokenContract(this.tokenY);
      let dexY = new DexTokenHolder(this.address, tokenY.deriveTokenId());
      let dy = await dexY.swap(sender, dx, this.tokenX);
      await tokenY.transfer(dexY.self, sender, dy);
      return dy;
    }

    /**
     * Swap Y tokens for X tokens
     * @param dy input amount of Y tokens
     * @return output amount Y tokens
     *
     * The transaction needs to be signed by the user's private key.
     */
    @method.returns(UInt64)
    async swapY(dy: UInt64) {
      let sender = this.sender.getUnconstrained(); // unconstrained because swap() requires the signature anyway
      let tokenX = new TokenContract(this.tokenX);
      let dexX = new DexTokenHolder(this.address, tokenX.deriveTokenId());
      let dx = await dexX.swap(sender, dy, this.tokenY);
      await tokenX.transfer(dexX.self, sender, dx);
      return dx;
    }

    /**
     * helper method to approve burning of user's liquidity.
     * this just burns user tokens, so there is no incentive to call this directly.
     * instead, the dex token holders call this and in turn pay back tokens.
     *
     * @param user caller address
     * @param dl input amount of lq tokens
     * @returns total supply of lq tokens _before_ burning dl, so that caller can calculate how much dx / dx to returns
     *
     * The transaction needs to be signed by the user's private key.
     */
    @method.returns(UInt64)
    async burnLiquidity(user: PublicKey, dl: UInt64) {
      // this makes sure there is enough l to burn (user balance stays >= 0), so l stays >= 0, so l was >0 before
      this.internal.burn({ address: user, amount: dl });
      let l = this.totalSupply.get();
      this.totalSupply.requireEquals(l);
      this.totalSupply.set(l.sub(dl));
      return l;
    }
  }

  class ModifiedDex extends Dex {
    async deploy() {
      await super.deploy();
      // override the isNew requirement for re-deploying
      this.account.isNew.requireNothing();
    }

    @method.returns(UInt64)
    async swapX(dx: UInt64) {
      let sender = this.sender.getUnconstrained(); // unconstrained because swap() requires the signature anyway
      let tokenY = new TokenContract(this.tokenY);
      let dexY = new ModifiedDexTokenHolder(
        this.address,
        tokenY.deriveTokenId()
      );
      let dy = await dexY.swap(sender, dx, this.tokenX);
      await tokenY.transfer(dexY.self, sender, dy);
      return dy;
    }
  }

  class DexTokenHolder extends SmartContract {
    // simpler circuit for redeeming liquidity -- direct trade between our token and lq token
    // it's incomplete, as it gives the user only the Y part for an lqXY token; but doesn't matter as there's no incentive to call it directly
    // see the more complicated method `redeemLiquidity` below which gives back both tokens, by calling this method,
    // for the other token, in a callback
    @method.returns(UInt64x2)
    async redeemLiquidityPartial(user: PublicKey, dl: UInt64) {
      // user burns dl, approved by the Dex main contract
      let dex = new Dex(addresses.dex);
      let l = await dex.burnLiquidity(user, dl);

      // in return, we give dy back
      let y = this.account.balance.get();
      this.account.balance.requireEquals(y);
      // we can safely divide by l here because the Dex contract logic wouldn't allow burnLiquidity if not l>0
      let dy = y.mul(dl).div(l);
      // just subtract the balance, user gets their part one level higher
      this.balance.subInPlace(dy);

      // be approved by the token owner parent
      this.self.body.mayUseToken = AccountUpdate.MayUseToken.ParentsOwnToken;

      // return l, dy so callers don't have to walk their child account updates to get it
      return { values: [l, dy] };
    }

    // more complicated circuit, where we trigger the Y(other)-lqXY trade in our child account updates and then add the X(our) part
    @method.returns(UInt64x2)
    async redeemLiquidity(
      user: PublicKey,
      dl: UInt64,
      otherTokenAddress: PublicKey
    ) {
      // first call the Y token holder, approved by the Y token contract; this makes sure we get dl, the user's lqXY
      let tokenY = new TokenContract(otherTokenAddress);
      let dexY = new DexTokenHolder(this.address, tokenY.deriveTokenId());
      let { values } = await dexY.redeemLiquidityPartial(user, dl);
      let l = values[0];
      let dy = values[1];
      await tokenY.transfer(dexY.self, user, dy);

      // in return for dl, we give back dx, the X token part
      let x = this.account.balance.get();
      this.account.balance.requireEquals(x);
      let dx = x.mul(dl).div(l);
      // just subtract the balance, user gets their part one level higher
      this.balance.subInPlace(dx);

      return { values: [dx, dy] };
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
      let tokenX = new TokenContract(otherTokenAddress);
      // get balances
      let dexX = AccountUpdate.create(this.address, tokenX.deriveTokenId());
      let x = dexX.account.balance.getAndRequireEquals();
      let y = this.account.balance.getAndRequireEquals();
      // send x from user to us (i.e., to the same address as this but with the other token)
      await tokenX.transfer(user, dexX, dx);
      // compute and send dy
      let dy = y.mul(dx).div(x.add(dx));
      // just subtract dy balance and let adding balance be handled one level higher
      this.balance.subInPlace(dy);
      return dy;
    }
  }

  class ModifiedDexTokenHolder extends DexTokenHolder {
    /**
     * This swap method has a slightly changed formula
     */
    @method.returns(UInt64)
    async swap(
      user: PublicKey,
      otherTokenAmount: UInt64,
      otherTokenAddress: PublicKey
    ) {
      let dx = otherTokenAmount;
      let tokenX = new TokenContract(otherTokenAddress);
      // get balances
      let dexX = AccountUpdate.create(this.address, tokenX.deriveTokenId());
      let x = dexX.account.balance.getAndRequireEquals();
      let y = this.account.balance.get();
      this.account.balance.requireEquals(y);
      await tokenX.transfer(user, dexX, dx);

      // this formula has been changed - we just give the user an additional 15 token
      let dy = y.mul(dx).div(x.add(dx)).add(15);

      this.balance.subInPlace(dy);
      return dy;
    }
  }

  /**
   * Helper to get the various token balances for checks in tests
   */
  function getTokenBalances() {
    let balances = {
      user: { MINA: 0n, X: 0n, Y: 0n, lqXY: 0n },
      user2: { MINA: 0n, X: 0n, Y: 0n, lqXY: 0n },
      dex: { X: 0n, Y: 0n },
      tokenContract: { X: 0n, Y: 0n },
      total: { lqXY: 0n },
    };
    for (let user of ['user', 'user2'] as const) {
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
      balances.tokenContract.X = Mina.getBalance(
        addresses.tokenX,
        tokenIds.X
      ).toBigInt();
    } catch {}
    try {
      balances.tokenContract.Y = Mina.getBalance(
        addresses.tokenY,
        tokenIds.Y
      ).toBigInt();
    } catch {}
    try {
      let dex = new Dex(addresses.dex);
      balances.total.lqXY = dex.totalSupply.get().toBigInt();
    } catch {}
    return balances;
  }

  return {
    Dex,
    DexTokenHolder,
    ModifiedDexTokenHolder,
    ModifiedDex,
    getTokenBalances,
  };
}

/**
 * Simple token with API flexible enough to handle all our use cases
 */
class TokenContract extends BaseTokenContract {
  @method async init() {
    super.init();
    // mint the entire supply to the token account with the same address as this contract
    /**
     * DUMB STUFF FOR TESTING (change in real app)
     *
     * we mint the max uint64 of tokens here, so that we can overflow it in tests if we just mint a bit more
     */
    let receiver = this.internal.mint({
      address: this.address,
      amount: UInt64.MAXINT(),
    });
    // assert that the receiving account is new, so this can be only done once
    receiver.account.isNew.requireEquals(Bool(true));
    // pay fees for opened account
    this.balance.subInPlace(Mina.getNetworkConstants().accountCreationFee);
  }

  /**
   * DUMB STUFF FOR TESTING (delete in real app)
   *
   * mint additional tokens to some user, so we can overflow token balances
   */
  @method async init2() {
    let receiver = this.internal.mint({
      address: addresses.user,
      amount: UInt64.from(10n ** 6n),
    });
    // assert that the receiving account is new, so this can be only done once
    receiver.account.isNew.requireEquals(Bool(true));
    // pay fees for opened account
    this.balance.subInPlace(Mina.getNetworkConstants().accountCreationFee);
  }

  @method
  async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }
}

const savedKeys = [
  'EKFcUu4FLygkyZR8Ch4F8hxuJps97GCfiMRSWXDP55sgvjcmNGHc',
  'EKENfq7tEdTf5dnNxUgVo9dUnAqrEaB9syTgFyuRWinR5gPuZtbG',
  'EKEPVj2PDzQUrMwL2yeUikoQYXvh4qrkSxsDa7gegVcDvNjAteS5',
  'EKDm7SHWHEP5xiSbu52M1Z4rTFZ5Wx7YMzeaC27BQdPvvGvF42VH',
  'EKEuJJmmHNVHD1W2qmwExDyGbkSoKdKmKNPZn8QbqybVfd2Sd4hs',
  'EKEyPVU37EGw8CdGtUYnfDcBT2Eu7B6rSdy64R68UHYbrYbVJett',
];

let { keys, addresses } = randomAccounts(
  process.env.USE_CUSTOM_LOCAL_NETWORK === 'true',
  'tokenX',
  'tokenY',
  'dex',
  'user',
  'user2',
  'user3'
);
let tokenIds = {
  X: TokenId.derive(addresses.tokenX),
  Y: TokenId.derive(addresses.tokenY),
  lqXY: TokenId.derive(addresses.dex),
};

/**
 * Predefined accounts keys, labeled by the input strings. Useful for testing/debugging with consistent keys.
 */
function randomAccounts<K extends string>(
  createNewAccounts: boolean,
  ...names: [K, ...K[]]
): { keys: Record<K, PrivateKey>; addresses: Record<K, PublicKey> } {
  let base58Keys = createNewAccounts
    ? Array(6)
        .fill('')
        .map(() => PrivateKey.random().toBase58())
    : savedKeys;
  let keys = Object.fromEntries(
    names.map((name, idx) => [name, PrivateKey.fromBase58(base58Keys[idx])])
  ) as Record<K, PrivateKey>;
  let addresses = Object.fromEntries(
    names.map((name) => [name, keys[name].toPublicKey()])
  ) as Record<K, PublicKey>;
  return { keys, addresses };
}
