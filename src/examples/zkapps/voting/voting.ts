/*
 * Warning: The reducer API in o1js is currently not safe to use in production applications. The `reduce()` 
 * method breaks if more than the hard-coded number (default: 32) of actions are pending. Work is actively 
 * in progress to mitigate this limitation.
 */ 
import {
  Field,
  SmartContract,
  state,
  State,
  method,
  Permissions,
  PublicKey,
  Bool,
  Reducer,
  provablePure,
  AccountUpdate,
  Provable,
} from 'o1js';

import { Member } from './member.js';
import {
  ElectionPreconditions,
  ParticipantPreconditions,
} from './preconditions.js';
import { Membership_ } from './membership.js';

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

type VotingParams = {
  electionPreconditions: ElectionPreconditions;
  voterPreconditions: ParticipantPreconditions;
  candidatePreconditions: ParticipantPreconditions;
  candidateAddress: PublicKey;
  voterAddress: PublicKey;
  contractAddress: PublicKey;
  doProofs: boolean;
};

/**
 * Returns a new contract instance that based on a set of preconditions.
 * @param params {@link Voting_}
 */
export async function Voting(params: VotingParams): Promise<Voting_> {
  electionPreconditions = params.electionPreconditions;
  voterPreconditions = params.voterPreconditions;
  candidatePreconditions = params.candidatePreconditions;
  candidateAddress = params.candidateAddress;
  voterAddress = params.voterAddress;

  let contract = new Voting_(params.contractAddress);
  params.doProofs = true;
  if (params.doProofs) {
    await Voting_.compile();
  }
  return contract;
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

  reducer = Reducer({ actionType: Member });

  events = {
    newVoteFor: PublicKey,
    newVoteState: provablePure({
      accumulatedVotesRoot: Field,
      committedVotesRoot: Field,
    }),
  };

  async deploy() {
    await super.deploy();
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editActionState: Permissions.proofOrSignature(),
      incrementNonce: Permissions.proofOrSignature(),
      setVerificationKey: Permissions.VerificationKey.none(),
      setPermissions: Permissions.proofOrSignature(),
    });
    this.accumulatedVotes.set(Reducer.initialActionState);
  }

  /**
   * Method used to register a new voter. Calls the `addEntry(member)` method of the Voter-Membership contract.
   * @param member
   */
  @method
  async voterRegistration(member: Member) {
    let currentSlot = this.network.globalSlotSinceGenesis.get();
    this.network.globalSlotSinceGenesis.requireBetween(
      currentSlot,
      currentSlot.add(10)
    );

    // can only register voters before the election has started
    Provable.if(
      electionPreconditions.enforce,
      currentSlot.lessThanOrEqual(electionPreconditions.startElection),
      Bool(true)
    ).assertTrue('Outside of election period!');

    // can only register voters if their balance is gte the minimum amount required
    // this snippet pulls the account data of an address from the network

    let accountUpdate = AccountUpdate.create(member.publicKey);

    accountUpdate.account.balance.requireEquals(
      accountUpdate.account.balance.get()
    );

    let balance = accountUpdate.account.balance.get();

    balance.assertGreaterThanOrEqual(
      voterPreconditions.minMina,
      'Balance not high enough!'
    );
    balance.assertLessThanOrEqual(
      voterPreconditions.maxMina,
      'Balance too high!'
    );

    let VoterContract: Membership_ = new Membership_(voterAddress);
    let exists = await VoterContract.addEntry(member);

    // the check happens here because we want to see if the other contract returns a value
    // if exists is true, that means the member already exists within the accumulated state
    // if its false, its a new entry
    exists.assertFalse('Member already exists!');
  }

  /**
   * Method used to register a new candidate.
   * Calls the `addEntry(member)` method of the Candidate-Membership contract.
   * @param member
   */
  @method
  async candidateRegistration(member: Member) {
    let currentSlot = this.network.globalSlotSinceGenesis.get();
    this.network.globalSlotSinceGenesis.requireBetween(
      currentSlot,
      currentSlot.add(10)
    );

    // can only register candidates before the election has started
    Provable.if(
      electionPreconditions.enforce,
      currentSlot.lessThanOrEqual(electionPreconditions.startElection),
      Bool(true)
    ).assertTrue('Outside of election period!');

    // can only register candidates if their balance is gte the minimum amount required
    // and lte the maximum amount
    // this snippet pulls the account data of an address from the network

    let accountUpdate = AccountUpdate.create(member.publicKey);
    accountUpdate.account.balance.requireEquals(
      accountUpdate.account.balance.get()
    );

    let balance = accountUpdate.account.balance.get();

    balance.assertGreaterThanOrEqual(
      candidatePreconditions.minMina,
      'Balance not high enough!'
    );
    balance.assertLessThanOrEqual(
      candidatePreconditions.maxMina,
      'Balance too high!'
    );

    let CandidateContract: Membership_ = new Membership_(candidateAddress);
    let exists = await CandidateContract.addEntry(member);

    // the check happens here because we want to see if the other contract returns a value
    // if exists is true, that means the member already exists within the accumulated state
    // if its false, its a new entry
    exists.assertEquals(false);
  }

  /**
   * Method used to register update all pending member registrations.
   * Calls the `publish()` method of the Candidate-Membership and Voter-Membership contract.
   */
  @method
  async approveRegistrations() {
    // Invokes the publish method of both Voter and Candidate Membership contracts.
    let VoterContract: Membership_ = new Membership_(voterAddress);
    await VoterContract.publish();

    let CandidateContract: Membership_ = new Membership_(candidateAddress);
    await CandidateContract.publish();
  }

  /**
   * Method used to cast a vote to a specific candidate.
   * Dispatches a new vote sequence event.
   * @param candidate
   * @param voter
   */
  @method
  async vote(candidate: Member, voter: Member) {
    let currentSlot = this.network.globalSlotSinceGenesis.get();
    this.network.globalSlotSinceGenesis.requireBetween(
      currentSlot,
      currentSlot.add(10)
    );

    // we can only vote in the election period time frame
    Provable.if(
      electionPreconditions.enforce,
      currentSlot
        .greaterThanOrEqual(electionPreconditions.startElection)
        .and(currentSlot.lessThanOrEqual(electionPreconditions.endElection)),
      Bool(true)
    ).assertTrue('Not in voting period!');

    // verifying that both the voter and the candidate are actually part of our member set
    // ideally we would also verify a signature here, but ignoring that for now
    let VoterContract: Membership_ = new Membership_(voterAddress);
    (await VoterContract.isMember(voter)).assertTrue('Member is not a voter!');

    let CandidateContract: Membership_ = new Membership_(candidateAddress);
    (await CandidateContract.isMember(candidate)).assertTrue(
      'Member is not a candidate!'
    );

    // emits a sequence event with the information about the candidate
    this.reducer.dispatch(candidate);

    this.emitEvent('newVoteFor', candidate.publicKey);
  }

  /**
   * Method used to accumulate all pending votes from sequence events
   * and applies state changes to the votes merkle tree.
   */
  @method
  async countVotes() {
    let accumulatedVotes = this.accumulatedVotes.get();
    this.accumulatedVotes.requireEquals(accumulatedVotes);

    let committedVotes = this.committedVotes.get();
    this.committedVotes.requireEquals(committedVotes);

    let actions = this.reducer.getActions({
      fromActionState: accumulatedVotes,
    });
    let newCommittedVotes = this.reducer.reduce(
      actions,
      Field,
      (state: Field, action: Member) => {
        // apply one vote
        action = action.addVote();
        // this is the new root after we added one vote
        return action.votesWitness.calculateRoot(action.getHash());
      },
      // initial state
      committedVotes
    );

    let newAccumulatedVotes = actions.hash;
    this.committedVotes.set(newCommittedVotes);
    this.accumulatedVotes.set(newAccumulatedVotes);

    this.emitEvent('newVoteState', {
      committedVotesRoot: newCommittedVotes,
      accumulatedVotesRoot: newAccumulatedVotes,
    });
  }
}
