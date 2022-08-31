import {
  AsFieldElements,
  Bool,
  CircuitString,
  circuitValue,
  DeployArgs,
  Field,
  method,
  Party,
  PublicKey,
  SmartContract,
  State,
  state,
  UInt64,
  Account,
  Experimental,
} from 'snarkyjs';

/**
 * ERC-20 token standard.
 * https://ethereum.org/en/developers/docs/standards/tokens/erc-20/
 */
type Erc20 = {
  // pure view functions which don't need @method
  name?: () => CircuitString;
  symbol?: () => CircuitString;
  decimals?: () => Field; // TODO: should be UInt8 which doesn't exist yet
  totalSupply(): UInt64;
  balanceOf(owner: PublicKey): UInt64;
  allowance(owner: PublicKey, spender: PublicKey): UInt64;

  // mutations which need @method
  transfer(to: PublicKey, value: UInt64): Bool; // emits "Transfer" event; needs msg.sender
  transferFrom(from: PublicKey, to: PublicKey, value: UInt64): Bool; // emits "Transfer" event
  approve(spender: PublicKey, value: UInt64): Bool; // emits "Approve" event; needs msg.sender

  // events
  events: {
    Transfer: AsFieldElements<{
      from: PublicKey;
      to: PublicKey;
      value: UInt64;
    }>;
    Approval: AsFieldElements<{
      owner: PublicKey;
      spender: PublicKey;
      value: UInt64;
    }>;
  };
};

// TODO: we need to expose msg.sender to implement transfer() and approve()
// is this always === the fee payer? probably fine if it is
// => need transaction interface which takes the PUBLIC key of the sender / fee payer
//    because the private key sits in a wallet and shouldn't be accessible to the website
//    which creates the transaction.
// => can keep mode where sender is unknown, but then methods relying on msg.sender have to FAIL

class SomeCoin extends SmartContract implements Erc20 {
  @state(UInt64) supply = State<UInt64>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.tokenSymbol.set('SOM');
  }

  name(): CircuitString {
    return CircuitString.fromString('SomeCoin');
  }
  symbol(): CircuitString {
    return CircuitString.fromString('SOM');
  }
  decimals(): Field {
    return Field(9);
  }
  totalSupply(): UInt64 {
    return this.supply.get();
  }
  balanceOf(owner: PublicKey): UInt64 {
    let account = Account(owner, this.experimental.token.id);
    let balance = account.balance.get();
    account.balance.assertEquals(balance);
    return balance;
  }
  allowance(owner: PublicKey, spender: PublicKey): UInt64 {
    // TODO: implement allowances
    return UInt64.zero;
  }

  @method transfer(to: PublicKey, value: UInt64): Bool {
    throw Error('TODO: reliably get msg.sender');
  }
  @method transferFrom(from: PublicKey, to: PublicKey, value: UInt64): Bool {
    this.experimental.token.send({ from, to, amount: value });
    return Bool(true);
  }
  @method approve(spender: PublicKey, value: UInt64): Bool {
    // TODO: implement allowances
    return Bool(false);
  }

  events = {
    Transfer: circuitValue<{ from: PublicKey; to: PublicKey; value: UInt64 }>({
      from: PublicKey,
      to: PublicKey,
      value: UInt64,
    }),
    Approval: circuitValue<{
      owner: PublicKey;
      spender: PublicKey;
      value: UInt64;
    }>({ owner: PublicKey, spender: PublicKey, value: UInt64 }),
  };
}
