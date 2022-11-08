import {
  Account,
  Bool,
  Circuit,
  DeployArgs,
  Field,
  Int64,
  isReady,
  method,
  Mina,
  AccountUpdate,
  Permissions,
  PrivateKey,
  PublicKey,
  SmartContract,
  Token,
  UInt64,
  VerificationKey,
  Struct,
  State,
  state,
  UInt32,
} from 'snarkyjs';

export { createDex, TokenContract, keys, addresses, tokenIds };

class UInt64x2 extends Struct([UInt64, UInt64]) {}

function createDex({
  lockedLiquiditySlots,
}: { lockedLiquiditySlots?: number } = {}) {
  class Dex extends SmartContract {
    // addresses of token contracts are constants
    tokenX = addresses.tokenX;
    tokenY = addresses.tokenY;

    /**
     * state which keeps track of total lqXY supply -- this is needed to calculate what to return when redeeming liquidity
     *
     * total supply is zero initially; it increases when supplying liquidity and decreases when redeeming it
     */
    @state(UInt64) totalSupply = State<UInt64>();

    /**
     * Mint liquidity tokens in exchange for X and Y tokens
     * @param user caller address
     * @param dx input amount of X tokens
     * @param dy input amount of Y tokens
     * @return output amount of lqXY tokens
     *
     * This function fails if the X and Y token amounts don't match the current X/Y ratio in the pool.
     * This can also be used if the pool is empty. In that case, there is no check on X/Y;
     * instead, the input X and Y amounts determine the initial ratio.
     *
     * The transaction needs to be signed by the user's private key.
     */
    @method supplyLiquidityBase(
      user: PublicKey,
      dx: UInt64,
      dy: UInt64
    ): UInt64 {
      let tokenX = new TokenContract(this.tokenX);
      let tokenY = new TokenContract(this.tokenY);

      // get balances of X and Y token
      // TODO: this creates extra account updates. we need to reuse these by passing them to or returning them from transfer()
      // but for that, we need the @method argument generalization
      let dexXBalance = tokenX.getBalance(this.address);
      let dexYBalance = tokenY.getBalance(this.address);

      // // assert dy == [dx * y/x], or x == 0
      let isXZero = dexXBalance.equals(UInt64.zero);
      let xSafe = Circuit.if(isXZero, UInt64.one, dexXBalance);
      let isDyCorrect = dy.equals(dx.mul(dexYBalance).div(xSafe));
      isDyCorrect.or(isXZero).assertTrue();

      tokenX.transfer(user, this.address, dx);
      tokenY.transfer(user, this.address, dy);

      // calculate liquidity token output simply as dl = dx + dx
      // => maintains ratio x/l, y/l
      let dl = dy.add(dx);
      let userUpdate = this.experimental.token.mint({
        address: user,
        amount: dl,
      });
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
        userUpdate.update.timing = {
          isSome: Bool(true),
          value: {
            initialMinimumBalance: amountLocked,
            cliffAmount: amountLocked,
            cliffTime: UInt32.from(lockedLiquiditySlots),
            vestingIncrement: UInt64.zero,
            vestingPeriod: UInt32.one,
          },
        };
        userUpdate.sign();
      }

      // update l supply
      let l = this.totalSupply.get();
      this.totalSupply.assertEquals(l);
      this.totalSupply.set(l.add(dl));
      return dl;
    }

    /**
     * Mint liquidity tokens in exchange for X and Y tokens
     * @param user caller address
     * @param dx input amount of X tokens
     * @return output amount of lqXY tokens
     *
     * This uses supplyLiquidityBase as the circuit, but for convenience,
     * the input amount of Y tokens is calculated automatically from the X tokens.
     * Fails if the liquidity pool is empty, so can't be used for the first deposit.
     *
     * The transaction needs to be signed by the user's private key.
     */
    supplyLiquidity(user: PublicKey, dx: UInt64): UInt64 {
      // calculate dy outside circuit
      let x = Account(this.address, Token.getId(this.tokenX)).balance.get();
      let y = Account(this.address, Token.getId(this.tokenY)).balance.get();
      if (x.value.isZero().toBoolean()) {
        throw Error(
          'Cannot call `supplyLiquidity` when reserves are zero. Use `supplyLiquidityBase`.'
        );
      }
      let dy = dx.mul(y).div(x);
      return this.supplyLiquidityBase(user, dx, dy);
    }

    /**
     * Burn liquidity tokens to get back X and Y tokens
     * @param user caller address
     * @param dl input amount of lqXY token
     * @return output amount of X and Y tokens, as a tuple [outputX, outputY]
     *
     * The transaction needs to be signed by the user's private key.
     */
    @method redeemLiquidity(user: PublicKey, dl: UInt64) {
      // call the token X holder inside a token X-approved callback
      let tokenX = new TokenContract(this.tokenX);
      let dexX = new DexTokenHolder(this.address, tokenX.experimental.token.id);
      let dxdy = dexX.redeemLiquidity(user, dl, this.tokenY);
      let dx = dxdy[0];
      tokenX.approveUpdateAndSend(dexX.self, user, dx);
      return dxdy;
    }

    /**
     * Swap X tokens for Y tokens
     * @param user caller address
     * @param dx input amount of X tokens
     * @return output amount Y tokens
     *
     * The transaction needs to be signed by the user's private key.
     */
    @method swapX(user: PublicKey, dx: UInt64): UInt64 {
      let tokenY = new TokenContract(this.tokenY);
      let dexY = new DexTokenHolder(this.address, tokenY.experimental.token.id);
      let dy = dexY.swap(user, dx, this.tokenX);
      tokenY.approveUpdateAndSend(dexY.self, user, dy);
      return dy;
    }

    /**
     * Swap Y tokens for X tokens
     * @param user caller address
     * @param dy input amount of Y tokens
     * @return output amount Y tokens
     *
     * The transaction needs to be signed by the user's private key.
     */
    @method swapY(user: PublicKey, dy: UInt64): UInt64 {
      let tokenX = new TokenContract(this.tokenX);
      let dexX = new DexTokenHolder(this.address, tokenX.experimental.token.id);
      let dx = dexX.swap(user, dy, this.tokenY);
      tokenX.approveUpdateAndSend(dexX.self, user, dx);
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
    @method burnLiquidity(user: PublicKey, dl: UInt64): UInt64 {
      // this makes sure there is enough l to burn (user balance stays >= 0), so l stays >= 0, so l was >0 before
      this.experimental.token.burn({ address: user, amount: dl });
      let l = this.totalSupply.get();
      this.totalSupply.assertEquals(l);
      this.totalSupply.set(l.sub(dl));
      return l;
    }

    @method transfer(from: PublicKey, to: PublicKey, amount: UInt64) {
      this.experimental.token.send({ from, to, amount });
    }
  }

  class DexTokenHolder extends SmartContract {
    // simpler circuit for redeeming liquidity -- direct trade between our token and lq token
    // it's incomplete, as it gives the user only the Y part for an lqXY token; but doesn't matter as there's no incentive to call it directly
    // see the more complicated method `redeemLiquidity` below which gives back both tokens, by calling this method,
    // for the other token, in a callback
    @method redeemLiquidityPartial(user: PublicKey, dl: UInt64): UInt64x2 {
      // user burns dl, approved by the Dex main contract
      let dex = new Dex(addresses.dex);
      let l = dex.burnLiquidity(user, dl);

      // in return, we give dy back
      let y = this.account.balance.get();
      this.account.balance.assertEquals(y);
      // we can safely divide by l here because the Dex contract logic wouldn't allow burnLiquidity if not l>0
      let dy = y.mul(dl).div(l);
      // just subtract the balance, user gets their part one level higher
      this.balance.subInPlace(dy);

      // this can't be a delegate call, or it won't be approved by the token owner
      this.self.isDelegateCall = Bool(false);

      // return l, dy so callers don't have to walk their child account updates to get it
      return [l, dy];
    }

    // more complicated circuit, where we trigger the Y(other)-lqXY trade in our child account updates and then add the X(our) part
    @method redeemLiquidity(
      user: PublicKey,
      dl: UInt64,
      otherTokenAddress: PublicKey
    ): UInt64x2 {
      // first call the Y token holder, approved by the Y token contract; this makes sure we get dl, the user's lqXY
      let tokenY = new TokenContract(otherTokenAddress);
      let dexY = new DexTokenHolder(this.address, tokenY.experimental.token.id);
      let result = dexY.redeemLiquidityPartial(user, dl);
      let l = result[0];
      let dy = result[1];
      tokenY.approveUpdateAndSend(dexY.self, user, dy);

      // in return for dl, we give back dx, the X token part
      let x = this.account.balance.get();
      this.account.balance.assertEquals(x);
      let dx = x.mul(dl).div(l);
      // just subtract the balance, user gets their part one level higher
      this.balance.subInPlace(dx);

      // this can't be a delegate call, or it won't be approved by the token owner
      this.self.isDelegateCall = Bool(false);

      return [dx, dy];
    }

    // this works for both directions (in our case where both tokens use the same contract)
    @method swap(
      user: PublicKey,
      otherTokenAmount: UInt64,
      otherTokenAddress: PublicKey
    ): UInt64 {
      // we're writing this as if our token == y and other token == x
      let dx = otherTokenAmount;
      let tokenX = new TokenContract(otherTokenAddress);
      // get balances
      let x = tokenX.getBalance(this.address);
      let y = this.account.balance.get();
      this.account.balance.assertEquals(y);
      // send x from user to us (i.e., to the same address as this but with the other token)
      tokenX.transfer(user, this.address, dx);
      // compute and send dy
      let dy = y.mul(dx).div(x.add(dx));
      // just subtract dy balance and let adding balance be handled one level higher
      this.balance.subInPlace(dy);
      // not be a delegate call
      this.self.isDelegateCall = Bool(false);
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

  return { Dex, DexTokenHolder, getTokenBalances };
}

/**
 * Simple token with API flexible enough to handle all our use cases
 */
class TokenContract extends SmartContract {
  deploy(args?: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      send: Permissions.proof(),
      receive: Permissions.proof(),
    });
  }
  @method init() {
    // mint the entire supply to the token account with the same address as this contract
    /**
     * DUMB STUFF FOR TESTING (change in real app)
     *
     * we mint the max uint64 of tokens here, so that we can overflow it in tests if we just mint a bit more
     */
    let receiver = this.experimental.token.mint({
      address: this.address,
      amount: UInt64.MAXINT(),
    });
    // assert that the receiving account is new, so this can be only done once
    receiver.account.isNew.assertEquals(Bool(true));
    // pay fees for opened account
    this.balance.subInPlace(Mina.accountCreationFee());
  }

  /**
   * DUMB STUFF FOR TESTING (delete in real app)
   *
   * mint additional tokens to some user, so we can overflow token balances
   */
  @method init2() {
    let receiver = this.experimental.token.mint({
      address: addresses.user,
      amount: UInt64.from(10n ** 6n),
    });
    // assert that the receiving account is new, so this can be only done once
    receiver.account.isNew.assertEquals(Bool(true));
    // pay fees for opened account
    this.balance.subInPlace(Mina.accountCreationFee());
  }

  // this is a very standardized deploy method. instead, we could also take the account update from a callback
  // => need callbacks for signatures
  @method deployZkapp(address: PublicKey, verificationKey: VerificationKey) {
    let tokenId = this.experimental.token.id;
    let zkapp = AccountUpdate.defaultAccountUpdate(address, tokenId);
    this.experimental.approve(zkapp);
    AccountUpdate.setValue(zkapp.update.permissions, {
      ...Permissions.default(),
      send: Permissions.proof(),
    });
    AccountUpdate.setValue(zkapp.update.verificationKey, verificationKey);
    zkapp.sign();
  }

  // let a zkapp send tokens to someone, provided the token supply stays constant
  @method approveUpdateAndSend(
    zkappUpdate: AccountUpdate,
    to: PublicKey,
    amount: UInt64
  ) {
    this.experimental.approve(zkappUpdate);

    // see if balance change cancels the amount sent
    let balanceChange = Int64.fromObject(zkappUpdate.body.balanceChange);
    balanceChange.assertEquals(Int64.from(amount).neg());
    // add same amount of tokens to the receiving address
    this.experimental.token.mint({ address: to, amount });
  }

  @method transfer(from: PublicKey, to: PublicKey, value: UInt64) {
    this.experimental.token.send({ from, to, amount: value });
  }

  @method getBalance(publicKey: PublicKey): UInt64 {
    let accountUpdate = AccountUpdate.create(
      publicKey,
      this.experimental.token.id
    );
    let balance = accountUpdate.account.balance.get();
    accountUpdate.account.balance.assertEquals(
      accountUpdate.account.balance.get()
    );
    return balance;
  }
}

await isReady;
let { keys, addresses } = randomAccounts(
  'tokenX',
  'tokenY',
  'dex',
  'user',
  'user2',
  'user3'
);
let tokenIds = {
  X: Token.getId(addresses.tokenX),
  Y: Token.getId(addresses.tokenY),
  lqXY: Token.getId(addresses.dex),
};

/**
 * Sum of balances of the account update and all its descendants
 */
function balanceSum(accountUpdate: AccountUpdate, tokenId: Field) {
  let myTokenId = accountUpdate.body.tokenId;
  let myBalance = Int64.fromObject(accountUpdate.body.balanceChange);
  let balance = Circuit.if(myTokenId.equals(tokenId), myBalance, Int64.zero);
  for (let child of accountUpdate.children.accountUpdates) {
    balance = balance.add(balanceSum(child, tokenId));
  }
  return balance;
}

/**
 * Predefined accounts keys, labeled by the input strings. Useful for testing/debugging with consistent keys.
 */
function randomAccounts<K extends string>(
  ...names: [K, ...K[]]
): { keys: Record<K, PrivateKey>; addresses: Record<K, PublicKey> } {
  let savedKeys = [
    'EKFV5T1zG13ksXKF4kDFx4bew2w4t27V3Hx1VTsbb66AKYVGL1Eu',
    'EKFE2UKugtoVMnGTxTakF2M9wwL9sp4zrxSLhuzSn32ZAYuiKh5R',
    'EKEn2s1jSNADuC8CmvCQP5CYMSSoNtx5o65H7Lahqkqp2AVdsd12',
    'EKE21kTAb37bekHbLvQpz2kvDYeKG4hB21x8VTQCbhy6m2BjFuxA',
    'EKF9JA8WiEAk7o3ENnvgMHg5XKwgQfyMowNFFrEDCevoSozSgLTn',
    'EKFZ41h3EDiTXAkwD3Mh2gVfy4CdeRGUzDPrEfXPgZR85J3KZ3WA',
  ];

  let keys = Object.fromEntries(
    names.map((name, idx) => [name, PrivateKey.fromBase58(savedKeys[idx])])
  ) as Record<K, PrivateKey>;
  let addresses = Object.fromEntries(
    names.map((name) => [name, keys[name].toPublicKey()])
  ) as Record<K, PublicKey>;
  return { keys, addresses };
}
