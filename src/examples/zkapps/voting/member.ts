import { Bool, CircuitValue, Field, prop, PublicKey, UInt64 } from 'snarkyjs';

export class Member extends CircuitValue {
  static count = 0;

  @prop publicKey: PublicKey;
  @prop balance: UInt64;
  @prop hashVoted: Bool;
  @prop accountId: Field;

  private constructor(publicKey: PublicKey, balance: UInt64, accountId: Field) {
    super();
    this.publicKey = publicKey;
    this.balance = balance;
    this.hashVoted = Bool(false);
    this.accountId = accountId;
  }

  static from(publicKey: PublicKey, balance: UInt64) {
    this.count++;
    return new Member(publicKey, balance, Field.fromNumber(this.count));
  }
}
