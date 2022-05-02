import { Field, state, State, method, SmartContract } from 'snarkyjs';

export { SimpleSnapp as default };

const initialState = 10;

class SimpleSnapp extends SmartContract {
  @state(Field) x = State<Field>();

  deploy() {
    super.deploy();
    this.x.set(Field(initialState));
  }

  @method update(y: Field) {
    let x = this.x.get();
    this.x.set(x.add(y));
  }
}
