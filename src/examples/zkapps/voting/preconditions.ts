import { UInt32, UInt64 } from 'snarkyjs';

export class ElectionPreconditions {
  startElection: UInt32;
  endElection: UInt32;

  static get default(): ElectionPreconditions {
    return new ElectionPreconditions(UInt32.zero, UInt32.MAXINT());
  }

  constructor(startElection: UInt32, endElection: UInt32) {
    this.startElection = startElection;
    this.endElection = endElection;
  }
}

export class ParticipantPreconditions {
  minMina: UInt64;
  maxMina: UInt64; // have to make this "generic" so it applys for both candidate and voter instances

  static get default(): ParticipantPreconditions {
    return new ParticipantPreconditions(UInt64.zero, UInt64.MAXINT());
  }

  constructor(minMina: UInt64, maxMina: UInt64) {
    this.minMina = minMina;
    this.maxMina = maxMina;
  }
}
