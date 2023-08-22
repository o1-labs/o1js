import {
  Field,
  PrivateKey,
  SmartContract,
  State,
  method,
  state,
} from 'snarkyjs';

export const adminPrivateKey = PrivateKey.random();
export const adminPublicKey = adminPrivateKey.toPublicKey();

export class HelloWorld extends SmartContract {
  @state(Field) x = State<Field>();

  init() {
    super.init();
    this.x.set(Field(2));
    this.account.delegate.set(adminPublicKey);
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
