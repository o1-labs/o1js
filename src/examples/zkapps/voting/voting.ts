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
  /**
   * Root of the merkle tree that stores all committed votes.
   */
  @state(Field) committedVotes = State<Field>();

  /**
   * Accumulator of all emitted votes.
   */
  @state(Field) accumulatedVotes = State<Field>();

  reducer = Experimental.Reducer({ actionType: Member });

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    this.accumulatedVotes.set(Experimental.Reducer.initialActionsHash);
    this.committedVotes.set(Field.zero); // TODO: set this to the initial merkle root
  }

  /**
   * Method used to register a new voter. Calls the `addEntry(member)` method of the Voter-Membership contract.
   * @param member
   */
  voterRegistration(member: Member) {
    let currentSlot = this.network.globalSlotSinceGenesis.get();
    currentSlot.assertEquals(this.network.globalSlotSinceGenesis.get());

    // we can only register voters before the election has started
    currentSlot.assertLt(electionPreconditions.startElection);

    // TODO: Invokes addEntry method on Voter Membership contract with member passed as an argument.
    let VoterContract = new Membership(VoterMembershipAddress);
    VoterContract.addEntry(member);
  }

  /**
   * Method used to register a new candidate.
   * Calls the `addEntry(member)` method of the Candidate-Membership contract.
   * @param member
   */
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

    let CandidateContract = new Membership(CandidateMembershipAddress);
    CandidateContract.addEntry(member);
  }

  /**
   * Method used to register update all pending member registrations.
   * Calls the `publish()` method of the Candidate-Membership and Voter-Membership contract.
   */
  authorizeRegistrations() {
    // Invokes the publish method of both Voter and Candidate Membership contracts.
    let VoterContract = new Membership(VoterMembershipAddress);
    VoterContract.publish();

    let CandidateContract = new Membership(CandidateMembershipAddress);
    CandidateContract.publish();
  }

  /**
   * Method used to cast a vote to a specific candidate.
   * Dispatches a new vote sequence event.
   * @param member
   */
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
    this.reducer.dispatch(candidate);
  }

  /**
   * Method used to accumulate all pending votes from open sequence events
   * and applies state changes to the votes merkle tree.
   */
  countVotes() {
    // Save the Sequence Events accumulated so far within the account’s state accumulatedMembers (AppState 1 in doc).
    // Update the committed storage with the Sequence Events accumulated so far.
    // Returns the JSON with the Candidates to Votes Count mapping.

    let accumulatedVotes = this.accumulatedVotes.get();
    this.accumulatedVotes.assertEquals(accumulatedVotes);

    let committedVotes = this.committedVotes.get();

    let { state: newCommittedVotes, actionsHash: newAccumulatedVotes } =
      this.reducer.reduce(
        [],
        Member,
        (state: Field, _action: Member) => {
          // TODO: apply changes to merkle tree
          return state.add(1);
        },
        // initial state
        { state: committedVotes, actionsHash: accumulatedVotes }
      );

    this.committedVotes.set(newCommittedVotes);
    this.accumulatedVotes.set(newAccumulatedVotes);
  }
}
