import { CircuitValue, prop, UInt64 } from 'o1js';

export default class ParticipantPreconditions extends CircuitValue {
  @prop minMinaVote: UInt64;
  @prop minMinaCandidate: UInt64;
  @prop maxMinaCandidate: UInt64;

  constructor(
    minMinaVote: UInt64,
    minMinaCandidate: UInt64,
    maxMinaCandidate: UInt64
  ) {
    super();
    this.minMinaVote = minMinaVote;
    this.minMinaCandidate = minMinaCandidate;
    this.maxMinaCandidate = maxMinaCandidate;
  }
}
