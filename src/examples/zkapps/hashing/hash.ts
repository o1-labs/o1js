import {
  Hash,
  UInt8,
  Field,
  SmartContract,
  state,
  State,
  method,
  Permissions,
  Struct,
} from 'snarkyjs';

let initialCommitment: Field = Field(0);

// 32 UInts
export class HashInput extends Struct({
  data: [
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
    UInt8,
  ],
}) {}

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

  @method SHA224(xs: HashInput) {
    const shaHash = Hash.SHA224.hash(xs.data);
    const commitment = Hash.hash(shaHash.map((f) => f.toField()));
    this.commitment.set(commitment);
  }

  @method SHA256(xs: HashInput) {
    const shaHash = Hash.SHA256.hash(xs.data);
    const commitment = Hash.hash(shaHash.map((f) => f.toField()));
    this.commitment.set(commitment);
  }

  @method SHA384(xs: HashInput) {
    const shaHash = Hash.SHA384.hash(xs.data);
    const commitment = Hash.hash(shaHash.map((f) => f.toField()));
    this.commitment.set(commitment);
  }

  @method SHA512(xs: HashInput) {
    const shaHash = Hash.SHA512.hash(xs.data);
    const commitment = Hash.hash(shaHash.map((f) => f.toField()));
    this.commitment.set(commitment);
  }

  @method Keccak256(xs: HashInput) {
    const shaHash = Hash.Keccak256.hash(xs.data);
    const commitment = Hash.hash(shaHash.map((f) => f.toField()));
    this.commitment.set(commitment);
  }
}
