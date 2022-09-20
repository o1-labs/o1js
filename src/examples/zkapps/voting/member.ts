import {
  Bool,
  CircuitValue,
  Field,
  prop,
  PublicKey,
  UInt64,
  Experimental,
  Token,
  Poseidon,
} from 'snarkyjs';

export class MerkleWitness extends Experimental.MerkleWitness(8) {}
let w = {
  isLeft: false,
  sibling: Field.zero,
};
let dummyWitness = Array.from(Array(MerkleWitness.height - 1).keys()).map(
  () => w
);

export class Member extends CircuitValue {
  private static count = 0;

  @prop publicKey: PublicKey;
  @prop tokenId: Field;
  @prop balance: UInt64;
  @prop accountId: Field;

  // will need this to keep track of votes for candidates
  @prop votes: Field;
  @prop isCandidate: Bool;

  // just to avoid double voting, but we can also ignore this for now
  @prop hashVoted: Bool;

  @prop witness: MerkleWitness;
  @prop votesWitness: MerkleWitness;

  constructor(
    publicKey: PublicKey,
    tokenId: Field,
    balance: UInt64,
    accountId: Field
  ) {
    super();
    this.publicKey = publicKey;
    this.tokenId = tokenId;
    this.balance = balance;
    this.hashVoted = Bool(false);
    this.accountId = accountId;
    this.isCandidate = Bool(false);
    this.votes = Field.zero;

    this.witness = new MerkleWitness(dummyWitness);
    this.votesWitness = new MerkleWitness(dummyWitness);
  }

  getHash(): Field {
    return Poseidon.hash(
      this.publicKey
        .toFields()
        .concat(this.tokenId.toFields())
        .concat(this.balance.toFields())
        .concat(this.accountId.toFields())
        .concat(this.votes.toFields())
        .concat(this.isCandidate.toFields())
        .concat(this.hashVoted.toFields())
    );
  }

  addVote(): Member {
    this.votes = this.votes.add(1);
    return this;
  }

  static empty() {
    return new Member(PublicKey.empty(), Field.zero, UInt64.zero, Field.zero);
  }

  static from(publicKey: PublicKey, tokenId: Field, balance: UInt64) {
    this.count++;
    return new Member(
      publicKey,
      tokenId,
      balance,
      Field.fromNumber(this.count)
    );
  }
}
