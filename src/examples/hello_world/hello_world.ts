import {
  Field,
  SmartContract,
  method,
  PrivateKey,
  Bool,
  State,
  Party,
  DeployArgs,
  state,
  Permissions,
  isReady,
} from '../../../dist/server/index.mjs';

class HelloWorld extends SmartContract {
  @state(Field) x = State<Field>();

  deploy(input: DeployArgs) {
    super.deploy(input);
    this.x.set(3);
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
