import { Bool, UInt32, UInt64 } from 'o1js';

export class ElectionPreconditions {
  startElection: UInt32;
  endElection: UInt32;
  enforce: Bool;
  static get default(): ElectionPreconditions {
    return new ElectionPreconditions(UInt32.zero, UInt32.MAXINT(), Bool(false));
  }

  constructor(startElection: UInt32, endElection: UInt32, enforce: Bool) {
    this.startElection = startElection;
    this.endElection = endElection;
    this.enforce = enforce;
  }
}

export class ParticipantPreconditions {
  minMina: UInt64;
  maxMina: UInt64; // have to make this "generic" so it applies for both candidate and voter instances

  static get default(): ParticipantPreconditions {
    return new ParticipantPreconditions(UInt64.zero, UInt64.MAXINT());
  }

  constructor(minMina: UInt64, maxMina: UInt64) {
    this.minMina = minMina;
    this.maxMina = maxMina;
  }
}
