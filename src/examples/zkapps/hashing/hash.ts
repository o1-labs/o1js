import {
  Hash,
  Field,
  SmartContract,
  state,
  State,
  method,
  Permissions,
  Bytes,
} from 'o1js';

let initialCommitment = Field(0);
class Bytes32 extends Bytes(32) {}

export class HashStorage extends SmartContract {
  @state(Field) commitment = State<Field>();

  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    this.commitment.set(initialCommitment);
  }

  @method async SHA256(xs: Bytes32) {
    const shaHash = Hash.SHA3_256.hash(xs);
    const commitment = Hash.hash(shaHash.toFields());
    this.commitment.set(commitment);
  }

  @method async SHA384(xs: Bytes32) {
    const shaHash = Hash.SHA3_384.hash(xs);
    const commitment = Hash.hash(shaHash.toFields());
    this.commitment.set(commitment);
  }

  @method async SHA512(xs: Bytes32) {
    const shaHash = Hash.SHA3_512.hash(xs);
    const commitment = Hash.hash(shaHash.toFields());
    this.commitment.set(commitment);
  }

  @method async Keccak256(xs: Bytes32) {
    const shaHash = Hash.Keccak256.hash(xs);
    const commitment = Hash.hash(shaHash.toFields());
    this.commitment.set(commitment);
  }
}
