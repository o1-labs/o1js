import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
} from 'snarkyjs';

export class Members extends SmartContract {
  // TODO: Add state variables

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    // TODO: Add account state initilaztion here
  }

  @method addEntry() {
    // Emit event that indicates adding this item
    // Preconditions: restrict who can vote or who can be a canidate
  }

  @method isMember(accountId) {
    // Verify membership with the accountId via merkletree committed to by the sequence events and returns a boolean
    // Preconditions:
  }

  @method publish() {
    // Commit to the items accumulated so far. This is a periodic update
  }
}
