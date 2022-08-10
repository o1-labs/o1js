import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
} from 'snarkyjs';

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

  @method addEntry(accountId) {
    // Emit event that indicates adding this item
    // Preconditions: Restrict who can vote or who can be a candidate
  }

  @method isMember(accountId) {
    // Verify membership (voter or candidate) with the accountId via merkletree committed to by the sequence events and returns a boolean
    // Preconditions: Item exists in committed storage
  }

  @method publish() {
    // Commit to the items accumulated so far. This is a periodic update
  }
}
