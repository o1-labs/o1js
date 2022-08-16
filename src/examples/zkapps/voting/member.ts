import { Bool, CircuitValue, Field, prop, PublicKey, UInt64 } from 'snarkyjs';

export class Member extends CircuitValue {
  private static count = 0;

  @prop publicKey: PublicKey;
  @prop tokenId: Field;
  @prop balance: UInt64;
  @prop hashVoted: Bool;
  @prop accountId: Field;

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
