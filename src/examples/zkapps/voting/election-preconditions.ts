import { Struct, UInt32 } from 'o1js';

export default class ElectionPreconditions extends Struct({
  startElection: UInt32,
  endElection: UInt32,
}) {}
