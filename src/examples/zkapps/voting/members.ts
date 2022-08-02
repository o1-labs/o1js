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
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method init() {
    // TODO: Add account state initilaztion here
  }

  @method addEntry() {}

  @method isMember(accountId) {
    // Verify membership via merkletree committed to by the sequence events and return a boolean
  }

  @method publish() {}
}
