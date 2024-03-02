import {
  Bool,
  Field,
  MerkleMap,
  MerkleMapWitness,
  Poseidon,
  Provable,
  PublicKey,
  Reducer,
  Signature,
  SmartContract,
  State,
  Struct,
  UInt64,
  UInt8,
  Unconstrained,
  method,
  state,
  provable,
  Mina,
} from 'o1js';
// import { provableTuple } from 'src/lib/circuit-value.js';

class PassportData extends Struct({
  country: UInt8,
  age: UInt8,
  expiry: UInt64,
}) {}

type Tuple = [any, ...any];

class PassportHolders extends SmartContract {
  @state(Field) passportHoldersRoot = State<Field>();
  @state(Field) currentActionState = State<Field>();

  reducer = Reducer({ actionType: provable([Field, Field] satisfies Tuple) });

  init() {
    this.passportHoldersRoot.set(new MerkleMap().getRoot());
  }

  @method register(
    address: PublicKey,
    passportData: PassportData,
    govSignature: Signature
  ) {
    // verify passport
    verifyValidPassport(passportData, govSignature);

    // create merkle map key and new value
    // TODO protect this hash from brute-forcing
    let key = Poseidon.hashPacked(PassportData, passportData);
    let value = Poseidon.hashPacked(PublicKey, address);

    // publish key and value
    this.reducer.dispatch([key, value]);
  }

  @method reduceRegister(passportHoldersMap: Unconstrained<MerkleMap>) {
    let initialRoot = this.passportHoldersRoot.getAndRequireEquals();
    let initialActionState = this.currentActionState.getAndRequireEquals();
    let actions = this.reducer.getActions({
      fromActionState: initialActionState,
    });

    let { state: newRoot, actionState: newActionState } = this.reducer.reduce(
      actions,
      Field,
      (oldRoot, [key, value]) => {
        // create a merkle map witness/path/proof
        let path = Provable.witness(MerkleMapWitness, () => {
          let map = passportHoldersMap.get();
          let path = map.getWitness(key);
          let current = map.get(key).toBigInt();
          if (current === 0n && key.toBigInt() !== 0n) map.set(key, value);
          return path;
        });

        // check that we have the right merkle path
        const emptyValue = Field(0);
        let [impliedRoot, impliedKey] = path.computeRootAndKey(emptyValue);
        impliedKey.assertEquals(key);
        let isEmpty = oldRoot.equals(impliedRoot);

        // update root with merkle path + new value
        // still works if (key, value) = (0, 0) bc new root is the same as old
        let [newRoot, _] = path.computeRootAndKey(value);

        return Provable.if(isEmpty, newRoot, oldRoot);
      },
      { state: initialRoot, actionState: initialActionState }
      // { useRecursion: true } // FIXME with new version
    );

    this.passportHoldersRoot.set(newRoot);
    this.currentActionState.set(newActionState);
  }
}

function verifyValidPassport(data: PassportData, signature: Signature) {
  // mocked
}
