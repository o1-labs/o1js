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
  Poseidon,
} from 'snarkyjs';

import { Member } from './member';
import {
  ElectionPreconditions,
  ParticipantPreconditions,
} from './preconditions';
import { Membership_ } from './membership';

// dummy value
let sequenceEvents: Field[][] = [];

/**
 * Address to the Membership instance that keeps track of Candidates.
 */
let candidateAddress = PublicKey.empty();

/**
 * Address to the Membership instance that keeps track of Voters.
 */
let voterAddress = PublicKey.empty();

/**
 * Requirements in order for a Member to participate in the election as a Candidate.
 */
let candidatePreconditions = ParticipantPreconditions.default;

/**
 * Requirements in order for a Member to participate in the election as a Voter.
 */
let voterPreconditions = ParticipantPreconditions.default;

/**
 * Defines the preconditions of an election.
 */
let electionPreconditions = ElectionPreconditions.default;

interface VotingParams {
  electionPreconditions: ElectionPreconditions;
  voterPreconditions: ParticipantPreconditions;
  candidatePreconditions: ParticipantPreconditions;
  candidateAddress: PublicKey;
  voterAddress: PublicKey;
}

/**
 * Returns a new contract class that based on a set of preconditions.
 * @param params {@link Voting_}
 */
export function Voting(params: VotingParams): typeof Voting_ {
  electionPreconditions = params.electionPreconditions;
  voterPreconditions = params.voterPreconditions;
  candidatePreconditions = params.candidatePreconditions;
  candidateAddress = params.candidateAddress;
  voterAddress = params.voterAddress;
  return Voting_;
}

export class Voting_ extends SmartContract {
  /**
   * Root of the merkle tree that stores all committed votes.
   */
  @state(Field) committedVotes = State<Field>();

  /**
   * Accumulator of all emitted votes.
   */
  @state(Field) accumulatedVotes = State<Field>();

  VoterContract: Membership_ = new Membership_(candidateAddress);
  CandidateContract: Membership_ = new Membership_(candidateAddress);
  reducer = Experimental.Reducer({ actionType: Member });

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
    });
  }

  /**
   * Method used to register a new voter. Calls the `addEntry(member)` method of the Voter-Membership contract.
   * @param member
   */
  @method
  voterRegistration(member: Member) {
    let currentSlot = this.network.globalSlotSinceGenesis.get();
    this.network.globalSlotSinceGenesis.assertEquals(currentSlot);

    // we can only register voters before the election has started
    currentSlot.assertLt(electionPreconditions.startElection);

    // ? should we also enforce preconditions here, or only on the membership SC side?
    member.balance.assertGte(voterPreconditions.minMina);

    this.VoterContract.addEntry(member);
  }

  /**
   * Method used to register a new candidate.
   * Calls the `addEntry(member)` method of the Candidate-Membership contract.
   * @param member
   */
  @method
  candidateRegistration(member: Member) {
    let currentSlot = this.network.globalSlotSinceGenesis.get();
    this.network.globalSlotSinceGenesis.assertEquals(currentSlot);

    // we can only register candidates before the election has started
    currentSlot.assertLt(electionPreconditions.startElection);

    // ! I dont think we can pull in the actually caller balance, right?
    // ? should we also enforce preconditions here, or only on the membership SC side?
    member.balance
      .gte(candidatePreconditions.minMina)
      .and(member.balance.lte(candidatePreconditions.maxMina))
      .assertTrue();

    //this.CandidateContract.addEntry(member);
  }

  /**
   * Method used to register update all pending member registrations.
   * Calls the `publish()` method of the Candidate-Membership and Voter-Membership contract.
   */
  @method
  authorizeRegistrations() {
    // Invokes the publish method of both Voter and Candidate Membership contracts.
    //this.VoterContract.publish();
    //this.CandidateContract.publish();
  }

  /**
   * Method used to cast a vote to a specific candidate.
   * Dispatches a new vote sequence event.
   * @param member
   */
  @method
  vote(candidate: Member) {
    let currentSlot = this.network.globalSlotSinceGenesis.get();
    this.network.globalSlotSinceGenesis.assertEquals(currentSlot);

    // we can only vote in the election period
    currentSlot
      .gte(electionPreconditions.startElection)
      .and(currentSlot.lte(electionPreconditions.endElection))
      .assertTrue();

    // TODO: derive voter accountId - how?
    //this.VoterContract.isMember(Field.zero).assertTrue();

    //this.CandidateContract.isMember(candidate.accountId).assertTrue();

    // emits a sequence event with the information about the candidate
    this.reducer.dispatch(candidate);
  }

  /**
   * Method used to accumulate all pending votes from open sequence events
   * and applies state changes to the votes merkle tree.
   */
  @method
  countVotes() {
    // Save the Sequence Events accumulated so far within the account’s state accumulatedMembers (AppState 1 in doc).
    // Update the committed storage with the Sequence Events accumulated so far.
    // Returns the JSON with the Candidates to Votes Count mapping.

    let accumulatedVotes = this.accumulatedVotes.get();
    this.accumulatedVotes.assertEquals(accumulatedVotes);

    let committedVotes = this.committedVotes.get();
    this.committedVotes.assertEquals(committedVotes);

    let { state: newCommittedVotes, actionsHash: newAccumulatedVotes } =
      this.reducer.reduce(
        sequenceEvents,
        Field,
        (state: Field, _action: Member) => {
          // TODO: apply changes to merkle tree
          // ! gotta fix the reducer first
          return state.add(1);
        },
        // initial state
        { state: committedVotes, actionsHash: accumulatedVotes }
      );

    this.committedVotes.set(newCommittedVotes);
    this.accumulatedVotes.set(newAccumulatedVotes);
  }
}
