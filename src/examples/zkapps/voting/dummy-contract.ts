import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
} from 'o1js';

export class DummyContract extends SmartContract {
  @state(Field) sum = State<Field>();

  async deploy(args: DeployArgs) {
    await super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editActionState: Permissions.proofOrSignature(),
      setPermissions: Permissions.proofOrSignature(),
      incrementNonce: Permissions.proofOrSignature(),
    });
    this.sum.set(Field(0));
  }

  /**
   * Method used to add two variables together.
   */
  @method async add(x: Field, y: Field) {
    this.sum.set(x.add(y));
  }
}
