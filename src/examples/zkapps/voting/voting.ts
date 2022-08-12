import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  Circuit,
  CircuitValue,
  UInt64,
  prop,
  UInt32,
} from 'snarkyjs';
import Member from './Member';

class ParticipantPreconditions extends CircuitValue {
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

class ElectionPreconditions extends CircuitValue {
  @prop startElection: UInt32;
  @prop endElection: UInt32;

  constructor(startElection: UInt32, endElection: UInt32) {
    super();
    this.startElection = startElection;
    this.endElection = endElection;
  }
}

export class Voting extends SmartContract {
  @state(ParticipantPreconditions) participantPreconditions =
    State<ParticipantPreconditions>();
  @state(ElectionPreconditions) electionPreconditions =
    State<ElectionPreconditions>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    // TODO: Add account state initilaztion here
  }

  voterRegistration(member: Member) {
    let conditions = this.electionPreconditions.get();
    conditions.assertEquals(this.electionPreconditions.get());

    let currentSlot = this.network.globalSlotSinceGenesis.get();
    currentSlot.assertEquals(this.network.globalSlotSinceGenesis.get());

    // we can only register voters before the election has started
    currentSlot.assertLt(conditions.startElection);

    // Invokes addEntry method on Voter Membership contract with member passed as an argument.
  }

  candidateRegistration(member: Member) {
    let electionPreconditions = this.electionPreconditions.get();
    electionPreconditions.assertEquals(this.electionPreconditions.get());

    let currentSlot = this.network.globalSlotSinceGenesis.get();
    currentSlot.assertEquals(this.network.globalSlotSinceGenesis.get());

    // we can only register candidates before the election has started
    currentSlot.assertLt(electionPreconditions.startElection);

    let participantPreconditions = this.participantPreconditions.get();
    participantPreconditions.assertEquals(participantPreconditions);

    // Invokes addEntry method on Candidate Membership contract with member passed as an argument.
  }

  authorizeRegistrations() {
    // Invokes the publish method of both Voter and Candidate Membership contracts.
  }

  vote(candidate: Member) {
    // Check if Voter and Candidate exist by calling the isMember method of corresponding Smart-Contracts
    // Emit corresponding Sequence Event with the Vote for Candidate information
  }

  countVotes() {
    // Save the Sequence Events accumulated so far within the account’s state accumulatedMembers (AppState 1 in doc).
    // Update the committed storage with the Sequence Events accumulated so far.
    // Returns the JSON with the Candidates to Votes Count mapping.
  }
}

function votingFactory() {
  return null;
}
