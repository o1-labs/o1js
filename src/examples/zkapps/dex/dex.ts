import {
  CircuitValue,
  method,
  prop,
  PublicKey,
  SmartContract,
  UInt64,
} from 'snarkyjs';

/*
Supply Liquidity:
Action: Supply liquidity for X and Y tokens (extension: with vesting) + 1 MINA to optionally create the lqXY token
At the start: Your wallet must have two tokens (X and Y) in proportion to each other (based on the current balance of the liquidity pool)
At the end: Your wallet does not have custody of those two tokens, and instead has custody of a “coat-check-claim-ticket”
(lqXY token) token that can be redeemed later for your two tokens

Redeem Liquidity:
Action: Redeem original liquidity for lqXY tokens
At the start: Your wallet has a balance for lqXY
At the end: Your wallet has a balance for the equivalent amount of X and Y tokens and fewer lqXY tokens

Swap:
Action: Swap some amount of token X for an equivalent amount of token Y
At the start: Your wallet must have that amount of token X that you want to swap
At the end: Your wallet as less of token X (the amount you swapped) and more on the proportional amount of token Y
*/

class Dex extends SmartContract {
  /**
   * Mint liquidity tokens in exchange for X and Y tokens
   * @param user caller address
   * @param inputX input amount of X tokens
   * @param inputY input amount of Y tokens
   * @return output amount of lqXY tokens
   *
   * This function fails if the X and Y token amounts don't match the current X/Y ratio in the pool.
   * This can also be used if the pool is empty. In that case, there is no check on X/Y;
   * instead, the input X and Y amounts determine the initial ratio.
   */
  @method supplyLiquidityBase(
    user: PublicKey,
    inputX: UInt64,
    inputY: UInt64
  ): UInt64 {}

  /**
   * Mint liquidity tokens in exchange for X and Y tokens
   * @param user caller address
   * @param inputX input amount of X tokens
   * @return output amount of lqXY tokens
   *
   * This uses supplyLiquidityBase as the circuit, but for convenience,
   * the input amount of Y tokens is calculated automatically from the X tokens.
   * Fails if the liquidity pool is empty, so can't be used for the first deposit.
   */
  supplyLiquidity(user: PublicKey, inputX: UInt64): UInt64 {}

  /**
   * Burn liquidity tokens to get back X and Y tokens
   * @param user caller address
   * @param inputL input amount of lqXY token
   * @return output amount of X and Y tokens, as a tuple [outputX, outputY]
   */
  @method redeemLiquidity(user: PublicKey, inputL: UInt64): UInt64x2 {}

  /**
   * Swap X and Y tokens
   * @param user caller address
   * @param inputX input amount of X tokens
   * @param inputY input amount of Y tokens
   * @return output amount of X and Y tokens, as a tuple [outputX, outputY]
   *
   * This can be used to swap X for Y OR swap Y for X.
   * To swap X for Y, pass in inputY = 0, and inputX = the amount of X tokens you want to spend.
   * To swap Y for X, pass in inputX = 0, and inputY = the amount of Y tokens you want to spend.
   */
  @method swap(user: PublicKey, inputX: UInt64, inputY: UInt64): UInt64x2 {}
}

// TODO: this is a pain -- let's define circuit values in one line, with a factory pattern
// we just have to make circuitValue return a class, that's it!
// class UInt64x2 extends circuitValue([UInt64, UInt64]) {}
class UInt64x2 extends CircuitValue {
  @prop 0: UInt64;
  @prop 1: UInt64;
}

class TokenHolder extends SmartContract {}
