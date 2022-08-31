import {
  Bool,
  CircuitString,
  Field,
  PublicKey,
  SmartContract,
  UInt64,
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
  allowance(owner: PublicKey, value: UInt64): UInt64; // emits "Approve" event

  // mutations which need @method
  transfer(to: PublicKey, value: UInt64): Bool; // emits "Transfer" event; needs msg.sender
  transferFrom(from: PublicKey, to: PublicKey, value: UInt64): Bool; // emits "Transfer" event
  approve(spender: PublicKey, value: UInt64): Bool; // emits "Approve" event; needs msg.sender

  // events
  events: {
    Transfer: { from: PublicKey; to: PublicKey; value: UInt64 };
    Approval: { owner: PublicKey; spender: PublicKey; value: UInt64 };
  };
};

// TODO: we need to expose msg.sender to implement transfer() and approve()
// is this always === the fee payer? probably fine if it is
// => need transaction interface which takes the PUBLIC key of the sender / fee payer
//    because the private key sits in a wallet and shouldn't be accessible to the website
//    which creates the transaction.
// => can keep mode where sender is unknown, but then methods relying on msg.sender have to FAIL
