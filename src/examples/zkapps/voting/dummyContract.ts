import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
} from 'snarkyjs';

export class DummyContract extends SmartContract {
  @state(Field) sum = State<Field>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
      setPermissions: Permissions.proofOrSignature(),
      setVerificationKey: Permissions.proofOrSignature(),
      incrementNonce: Permissions.proofOrSignature(),
    });
    this.sum.set(Field.zero);
  }

  /**
   * Method used to add two variables together.
   */
  @method add(x: Field, y: Field) {
    this.sum.set(x.add(y));
  }
}
