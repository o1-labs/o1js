import {
  Bool,
  CircuitValue,
  Field,
  prop,
  PublicKey,
  UInt64,
  Poseidon,
  MerkleWitness,
} from 'snarkyjs';

export class MyMerkleWitness extends MerkleWitness(8) {}
let w = {
  isLeft: false,
  sibling: Field(0),
};
let dummyWitness = Array.from(Array(MyMerkleWitness.height - 1).keys()).map(
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

  @prop witness: MyMerkleWitness;
  @prop votesWitness: MyMerkleWitness;

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
    this.votes = Field(0);

    this.witness = new MyMerkleWitness(dummyWitness);
    this.votesWitness = new MyMerkleWitness(dummyWitness);
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
    return new Member(PublicKey.empty(), Field(0), UInt64.zero, Field(0));
  }

  static from(publicKey: PublicKey, tokenId: Field, balance: UInt64) {
    this.count++;
    return new Member(publicKey, tokenId, balance, Field(this.count));
  }
}
