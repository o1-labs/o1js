import {
  Field,
  SmartContract,
  state,
  State,
  Party,
  method,
  DeployArgs,
  PrivateKey,
} from '../../../dist/server';

export const adminPrivateKey = PrivateKey.random();
export const adminPublicKey = adminPrivateKey.toPublicKey();

export class HelloWorld extends SmartContract {
  @state(Field) x = State<Field>();

  deploy(input: DeployArgs) {
    super.deploy(input);
    this.x.set(Field(3));
    Party.setValue(this.self.update.delegate, adminPublicKey);
  }

  @method update(squared: Field, admin: PrivateKey) {
    const x = this.x.get();
    this.x.assertEquals(x);
    x.square().assertEquals(squared);
    this.x.set(squared);

    const adminPk = admin.toPublicKey();
    this.account.delegate.assertEquals(adminPk);
  }
}
