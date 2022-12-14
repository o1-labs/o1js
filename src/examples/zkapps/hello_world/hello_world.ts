import {
  Field,
  SmartContract,
  state,
  State,
  AccountUpdate,
  method,
  DeployArgs,
  PrivateKey,
  Permissions,
  isReady,
} from 'snarkyjs';

await isReady;
// test
export const adminPrivateKey = PrivateKey.random();
export const adminPublicKey = adminPrivateKey.toPublicKey();

export class HelloWorld extends SmartContract {
  @state(Field) x = State<Field>();

  deploy(input: DeployArgs) {
    super.deploy(input);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    this.x.set(Field(2));

    AccountUpdate.setValue(this.self.update.delegate, adminPublicKey);
  }

  @method update(squared: Field, admin: PrivateKey) {
    const x = this.x.get();
    this.x.assertNothing();
    x.square().assertEquals(squared);
    this.x.set(squared);

    const adminPk = admin.toPublicKey();

    this.account.delegate.assertEquals(adminPk);
  }
}
