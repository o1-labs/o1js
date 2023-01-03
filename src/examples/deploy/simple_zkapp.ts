import { Field, state, State, method, SmartContract } from 'snarkyjs';

export { SimpleZkapp as default };

const initialState = 10;

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  init() {
    super.init();
    this.x.set(Field(initialState));
  }

  @method update(y: Field) {
    let x = this.x.get();
    this.x.set(x.add(y));
  }
}
