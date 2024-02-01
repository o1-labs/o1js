import {
  ProvablePure,
  Bool,
  CircuitString,
  provablePure,
  DeployArgs,
  Field,
  method,
  AccountUpdate,
  PublicKey,
  UInt64,
  Permissions,
  Mina,
  TokenContract,
  AccountUpdateForest,
} from 'o1js';

/**
 * ERC-20-like token standard.
 * https://ethereum.org/en/developers/docs/standards/tokens/erc-20/
 *
 * Differences to ERC-20:
 * - No approvals / allowance, because zkApps don't need them and they are a security footgun.
 * - `transferFrom()`, `transfer()` and `balanceOf()` can also take an account update as an argument.
 *   This form might be needed for zkApp token accounts, where the account update has to come from a method
 *   (in order to get proof authorization), and can't be created by the token contract itself.
 * - `transferFrom()` and `transfer()` don't return a boolean, because in the zkApp protocol,
 *   a transaction succeeds or fails in its entirety, and there is no need to handle partial failures.
 */
type Erc20 = {
  // pure view functions which don't need @method
  name?: () => CircuitString;
  symbol?: () => CircuitString;
  decimals?: () => Field; // TODO: should be UInt8 which doesn't exist yet
  totalSupply(): UInt64;
  balanceOf(owner: PublicKey | AccountUpdate): UInt64;

  // mutations which need @method
  transfer(to: PublicKey | AccountUpdate, value: UInt64): void; // emits "Transfer" event
  transferFrom(
    from: PublicKey | AccountUpdate,
    to: PublicKey | AccountUpdate,
    value: UInt64
  ): void; // emits "Transfer" event

  // events
  events: {
    Transfer: ProvablePure<{
      from: PublicKey;
      to: PublicKey;
      value: UInt64;
    }>;
  };
};

/**
 * A simple ERC20 token
 *
 * Tokenomics:
 * The supply is constant and the entire supply is initially sent to an account controlled by the zkApp developer
 * After that, tokens can be sent around with authorization from their owner, but new ones can't be minted.
 *
 * Functionality:
 * Just enough to be swapped by the DEX contract, and be secure
 */
class TrivialCoin extends TokenContract implements Erc20 {
  // constant supply
  SUPPLY = UInt64.from(10n ** 18n);

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.tokenSymbol.set('TRIV');
  }

  @method init() {
    super.init();

    // mint the entire supply to the token account with the same address as this contract
    let address = this.self.body.publicKey;
    let receiver = this.token.mint({
      address,
      amount: this.SUPPLY,
    });
    // assert that the receiving account is new, so this can be only done once
    receiver.account.isNew.requireEquals(Bool(true));
    // pay fees for opened account
    this.balance.subInPlace(Mina.getNetworkConstants().accountCreationFee);

    // since this is the only method of this zkApp that resets the entire state, provedState: true implies
    // that this function was run. Since it can be run only once, this implies it was run exactly once

    // make account non-upgradable forever
    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey: Permissions.impossible(),
      setPermissions: Permissions.impossible(),
      access: Permissions.proofOrSignature(),
    });
  }

  // ERC20 API
  name(): CircuitString {
    return CircuitString.fromString('TrivialCoin');
  }
  symbol(): CircuitString {
    return CircuitString.fromString('TRIV');
  }
  decimals(): Field {
    return Field(9);
  }
  totalSupply(): UInt64 {
    return this.SUPPLY;
  }
  balanceOf(owner: PublicKey | AccountUpdate): UInt64 {
    let update =
      owner instanceof PublicKey
        ? AccountUpdate.create(owner, this.token.id)
        : owner;
    return update.account.balance.getAndRequireEquals();
  }

  events = {
    Transfer: provablePure({
      from: PublicKey,
      to: PublicKey,
      value: UInt64,
    }),
  };

  // implement Approvable API

  @method approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }
}
