import {
  Bool,
  CircuitValue,
  Experimental,
  Field,
  prop,
  PublicKey,
  UInt64,
} from 'snarkyjs';

export class Member extends CircuitValue {
  private static count = 0;

  @prop publicKey: PublicKey;
  @prop tokenId: Field;
  @prop balance: UInt64;
  @prop accountId: Field;

  @prop votes: Field;
  @prop isCandidate: Bool;
  @prop hashVoted: Bool;

  // TODO: make work
  @prop witness: typeof Experimental.MerkleWitness;

  private constructor(
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
  }

  toFields(): Field[] {
    return this.publicKey
      .toFields()
      .concat(this.tokenId.toFields())
      .concat(this.balance.toFields())
      .concat(this.accountId.toFields())
      .concat(this.votes.toFields())
      .concat(this.isCandidate.toFields())
      .concat(this.hashVoted.toFields());
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
