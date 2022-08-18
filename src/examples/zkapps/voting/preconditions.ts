import { CircuitValue, prop, UInt32, UInt64 } from 'snarkyjs';

export class ElectionPreconditions extends CircuitValue {
  @prop startElection: UInt32;
  @prop endElection: UInt32;

  constructor(startElection: UInt32, endElection: UInt32) {
    super();
    this.startElection = startElection;
    this.endElection = endElection;
  }
}

export class ParticipantPreconditions extends CircuitValue {
  @prop minMina: UInt64;
  @prop maxMina: UInt64; // have to make this "generic" so it applys for both candidate and voter instances

  constructor(minMina: UInt64, maxMina: UInt64) {
    super();
    this.minMina = minMina;
    this.maxMina = maxMina;
  }
}

// i went with a factory pattern so we can more or less easily produce multiple sets of different contracts and preconditions
export function preconditionFactory(/* TODO: values for preconditions*/) {}
