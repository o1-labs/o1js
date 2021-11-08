

// TODO: Brandon look at Solidity for how "events" are consumed by other smart contracts
//
//
//

xxx.emitEvent()
xxx.setSnappUri()
xxx.

@recursive
class MyMergeRecursion extends RecursiveCircuit<Field> {
  @base base() { }

  @step step(@prev1 t: Field, @prev2 t: Field): Field {
  }
}

@recursive
class MyRecursion extends RecursiveCircuit<Field> {
  @base base(): Field { return Field.zero }

  @step step(@prev t: Field): Field {
    return t.add(1)
  }
}

class CoolerThanFaucet extends Snapp {
  // you can only smash the pinata by doing a recursive snark really fast
  //
  //
  @deploy init() {
  }

  @method foo(@proof p : MyRecursion) {
    // p.value is the value after executing all the steps
    p.value
  }
}



class Faucet extends Snapp {
  // ...
  //
  // You need to check the protocol state for the slot
  // You keep track of the last time you pulled from it in the account of the access
  //
  // Faucet is drippable every 100 blockHeights , store the most recent drip
  //
  //

}



// TODO: Figure this out
const txn = new PrivateMultisig().deployTransaction()
const txn2 = new PrivateMultisig().userTransaction()


class PrivateMultisig extends Snapp {
  keys: MerkleCollection<PublicKey>;
  // TODO: Use state decorator to provide mapping of snapp state onto class properties

  // This only runs when you deploy it?
  @deploy init() {

    this.permissions.receive = Permission.NoAuthRequired;

    for (let i = 0; i < this.state.length; ++i) {
      this.state[i].set(Field.zero);
    }
  }


  // The arguments here are witness data used by the prover
  @method send(w: SendData) {
    // The transaction property is automatically available (via the snapp decorator)
    // and corresponds to the transaction commitment which is part of the snapp statement.
    const transaction = this.transaction();
    const self = transaction.parties.get(0);

    self.nonce.assertEqual(w.nonce);

/*    const state = this.protocolState();
    state.currentSlot.assertEqual( */

    // this.precondition(self.nonce).isEqualTo(w.nonce)

    const msg = [transaction.commitment()];


    w.signatures.forEach(s => {
      const pubKey = this.keys.get(s.membershipProof);
      s.signature.verify(pubKey, msg).assertEqual(true);
    });

    self.balance.subInPlace(w.amount);

    // Get the second party (index 1) in this transaction, which will be the receiver
    const receiverAccount = transaction.parties.get(1);
    receiverAccount.balance.addInPlace(w.amount.sub(w.fee));
  }

  // This method is redundant given permissions
  @method receive(amount: Amount) {
    // The snapp statement also contains the snapp party-list at the current position,
    // accessible via transaction.self()
    const self = this.transaction().self();
    self.nonce.ignore();
    self.balance.addInPlace(amount);
  }

  constructor(keys: Array<PublicKey>) {
    super();
    this.keys = new MerkleCollection(() => keys);
  }
}
