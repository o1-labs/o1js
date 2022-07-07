import {
  Field,
  Circuit,
  CircuitValue,
  prop,
  public_,
  circuitMain,
  Signature,
  PrivateKey,
  PublicKey,
} from 'snarkyjs';

class Transaction extends CircuitValue {
  @prop sender: PublicKey;
  @prop receiver: PublicKey;
  @prop amount: Field;
}

/* Exercise 4:

Public input: a field element `lowerBound`
Prove:
  I know a signed transaction, sent to a public key that I control, for an amount > x.
*/

class Main extends Circuit {
  @circuitMain
  static main(
    transaction: Transaction,
    s: Signature,
    receiverPrivKey: PrivateKey,
    @public_ lowerBound: Field
  ) {
    s.verify(transaction.sender, transaction.toFields()).assertEquals(true);
    transaction.receiver.assertEquals(receiverPrivKey.toPublicKey());
    transaction.amount.assertGt(lowerBound);
  }
}
