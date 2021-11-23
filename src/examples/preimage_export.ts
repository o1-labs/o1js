import {
  Poseidon,
  Field,
  Circuit,
  circuitMain,
  public_,
} from '@o1labs/snarkyjs';

export default class Main extends Circuit {
  @circuitMain
  static main(preimage: Field, @public_ hash: Field) {
    Poseidon.hash([preimage]).assertEquals(hash);
  }
}
