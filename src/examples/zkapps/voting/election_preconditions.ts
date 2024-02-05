import { CircuitValue, prop, UInt32 } from 'o1js';

export default class ElectionPreconditions extends CircuitValue {
  @prop startElection: UInt32;
  @prop endElection: UInt32;

  constructor(startElection: UInt32, endElection: UInt32) {
    super();
    this.startElection = startElection;
    this.endElection = endElection;
  }
}
