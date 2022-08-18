import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  Bool,
} from 'snarkyjs';
import { Member } from './member';

/**
 * The Membership contract keeps track of a set of members.
 * The contract can either be of type Voter or Candidate.
 */
export class Membership extends SmartContract {
  // TODO: Add state variables

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
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
    return Bool(true);
  }

  /**
   * Method used to check whether a member exists within the accumulator.
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
  }
}
