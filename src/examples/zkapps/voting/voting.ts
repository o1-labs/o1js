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
  PrivateKey,
  Experimental,
  PublicKey,
} from 'snarkyjs';

import { Member } from './member';
import { ElectionPreconditions } from './election_preconditions';
import { ParticipantPreconditions } from './participant_preconditions';
import { Membership } from './membership';

// dummy values for now
let CandidateMembershipAddress = PrivateKey.random().toPublicKey();
let VoterMembershipAddress = PrivateKey.random().toPublicKey();

let participantPreconditions = new ParticipantPreconditions(
  UInt64.zero,
  UInt64.from(100),
  UInt64.from(10000)
);

let electionPreconditions = new ElectionPreconditions(
  UInt32.from(100),
  UInt32.from(150)
);

export class Voting extends SmartContract {
  @state(Field) accumulatedVotes = State<Field>();
  @state(Field) committedVotes = State<Field>();

  // we need a public key so we can associate a new vote with it
  reducer = Experimental.Reducer({ actionType: PublicKey });

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    this.accumulatedVotes.set(Experimental.Reducer.initialActionsHash);
    this.committedVotes.set(Field.zero); // TODO: set this to the initial merkle root
  }

  voterRegistration(member: Member) {
    let currentSlot = this.network.globalSlotSinceGenesis.get();
    currentSlot.assertEquals(this.network.globalSlotSinceGenesis.get());

    // we can only register voters before the election has started
    currentSlot.assertLt(electionPreconditions.startElection);

    // TODO: Invokes addEntry method on Voter Membership contract with member passed as an argument.
    let VoterContract = new Membership(VoterMembershipAddress);
    VoterContract.addEntry(member);
  }

  candidateRegistration(member: Member) {
    let currentSlot = this.network.globalSlotSinceGenesis.get();
    currentSlot.assertEquals(this.network.globalSlotSinceGenesis.get());

    // we can only register candidates before the election has started
    currentSlot.assertLt(electionPreconditions.startElection);

    // ! I dont think we can pull in the actually caller balance, right?
    member.balance
      .gte(participantPreconditions.minMinaCandidate)
      .and(member.balance.lte(participantPreconditions.maxMinaCandidate))
      .assertTrue();

    // TODO: Invokes addEntry method on Candidate Membership contract with member passed as an argument.
    let CandidateContract = new Membership(CandidateMembershipAddress);
    CandidateContract.addEntry(member);
  }

  authorizeRegistrations() {
    // Invokes the publish method of both Voter and Candidate Membership contracts.
    let VoterContract = new Membership(VoterMembershipAddress);
    VoterContract.publish();

    let CandidateContract = new Membership(CandidateMembershipAddress);
    CandidateContract.publish();
  }

  vote(candidate: Member) {
    let currentSlot = this.network.globalSlotSinceGenesis.get();
    currentSlot.assertEquals(this.network.globalSlotSinceGenesis.get());

    // we can only vote in the election period
    currentSlot
      .gte(electionPreconditions.startElection)
      .and(currentSlot.lte(electionPreconditions.endElection))
      .assertTrue();

    // Check if Voter and Candidate exist by calling the isMember method of corresponding Smart-Contracts
    // Emit corresponding Sequence Event with the Vote for Candidate information
    this.reducer.dispatch(candidate.publicKey);
  }

  countVotes() {
    // Save the Sequence Events accumulated so far within the account’s state accumulatedMembers (AppState 1 in doc).
    // Update the committed storage with the Sequence Events accumulated so far.
    // Returns the JSON with the Candidates to Votes Count mapping.

    let accumulatedVotes = this.accumulatedVotes.get();
    this.accumulatedVotes.assertEquals(accumulatedVotes);

    let { state: newState, actionsHash: newActionsHash } = this.reducer.reduce(
      [],
      PublicKey,
      // function that says how to apply an action
      (state: Field, _action: Field) => {
        return state.add(1);
      },
      { state: Field.zero, actionsHash: accumulatedVotes }
    );

    this.accumulatedVotes.set(newActionsHash);
  }
}
