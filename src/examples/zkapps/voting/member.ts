import { Bool, CircuitValue, prop, PublicKey, UInt64 } from 'snarkyjs';

export class Member extends CircuitValue {
  @prop publicKey: PublicKey;
  @prop balance: UInt64;
  @prop hashVoted: Bool;

  constructor() {
    super();
  }
}
