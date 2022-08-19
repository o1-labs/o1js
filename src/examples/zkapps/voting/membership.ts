import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  Bool,
  UInt64,
  PublicKey,
  Experimental,
} from 'snarkyjs';
import { Member } from './member';
import { ParticipantPreconditions } from './preconditions';

let participantPreconditions = ParticipantPreconditions.default;

interface MembershipParams {
  participantPreconditions: ParticipantPreconditions;
  contractAddress: PublicKey;
}

/**
 * Returns a new contract instance that based on a set of preconditions.
 * @param params {@link MembershipParams}
 */
export async function Membership(
  params: MembershipParams
): Promise<Membership_> {
  participantPreconditions = params.participantPreconditions;

  let contract = new Membership_(params.contractAddress);
  await Membership_.compile(params.contractAddress);

  return contract;
}

/**
 * The Membership contract keeps track of a set of members.
 * The contract can either be of type Voter or Candidate.
 */
export class Membership_ extends SmartContract {
  /**
   * Root of the merkle tree that stores all committed members.
   */
  @state(Field) committedMembers = State<Field>();

  /**
   * Accumulator of all emitted members.
   */
  @state(Field) accumulatedMembers = State<Field>();

  reducer = Experimental.Reducer({ actionType: Member });

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
    });
    // TODO: Add account state initilaztion here
  }

  /**
   * Method used to add a new member.
   * Dispatches a new member sequence event.
   * @param member
   */
  @method addEntry(member: Member): Bool {
    // Emit event that indicates adding this item
    // Preconditions: Restrict who can vote or who can be a candidate

    // since we need to keep this contract "generic", we always assert within a range
    // even tho voters cant have a maximum balance, only candidate
    // but for voter we simply use UInt64.MAXINT() as maximum
    member.balance
      .gte(participantPreconditions.minMina)
      .and(member.balance.lte(participantPreconditions.maxMina)).assertTrue;

    this.reducer.dispatch(member);
    return Bool(true);
  }

  /**
   * Method used to check whether a member exists within the committed storage.
   * @param accountId
   * @returns true if member exists
   */
  @method isMember(accountId: Field): Bool {
    // Verify membership (voter or candidate) with the accountId via merkletree committed to by the sequence events and returns a boolean
    // Preconditions: Item exists in committed storage
    return Bool(true);
  }

  /**
   * Method used to commit to the accumulated list of members.
   */
  @method publish() {
    // Commit to the items accumulated so far. This is a periodic update

    let accumulatedMembers = this.accumulatedMembers.get();
    this.accumulatedMembers.assertEquals(accumulatedMembers);

    let committedMembers = this.committedMembers.get();
    this.committedMembers.assertEquals(committedMembers);

    let { state: newCommittedMembers, actionsHash: newAccumulatedMembers } =
      this.reducer.reduce(
        [], // TODO: sequence events
        Field,
        (state: Field, _action: Member) => {
          // TODO: apply changes to merkle tree
          // ! gotta fix the reducer first
          return state.add(1);
        },
        // initial state
        { state: committedMembers, actionsHash: committedMembers }
      );

    this.committedMembers.set(newCommittedMembers);
    this.accumulatedMembers.set(newAccumulatedMembers);
  }
}
