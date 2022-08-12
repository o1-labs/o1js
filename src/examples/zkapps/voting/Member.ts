import { Bool, CircuitValue, prop, PublicKey } from 'snarkyjs';

export default class Member extends CircuitValue {
  @prop publicKey: PublicKey;
  @prop hashVoted: Bool;

  constructor() {
    super();
  }
}
