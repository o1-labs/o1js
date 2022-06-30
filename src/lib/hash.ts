import { Poseidon as Poseidon_, Field } from '../snarky';
import { inCheckedComputation } from './global-context';

export { Poseidon };

class Sponge {
  private sponge: unknown;

  constructor() {
    let isChecked = inCheckedComputation();
    this.sponge = Poseidon_.spongeCreate(isChecked);
  }

  absorb(x: Field) {
    Poseidon_.spongeAbsorb(this.sponge, x);
  }

  squeeze() {
    return Poseidon_.spongeSqueeze(this.sponge);
  }
}

const Poseidon = {
  hash(input: Field[]) {
    let isChecked = inCheckedComputation();
    // this is the same:
    // return Poseidon_.update(this.initialState, input, isChecked)[0];
    return Poseidon_.hash(input, isChecked);
  },

  update(state: [Field, Field, Field], input: Field[]) {
    let isChecked = inCheckedComputation();
    return Poseidon_.update(state, input, isChecked);
  },

  get initialState(): [Field, Field, Field] {
    return [Field.zero, Field.zero, Field.zero];
  },

  Sponge,
};
