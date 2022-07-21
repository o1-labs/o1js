import { Poseidon as Poseidon_, Field } from '../snarky';
import { inCheckedComputation } from './proof_system';

// external API
export { Poseidon };

// internal API
export { prefixes, emptyHashWithPrefix, hashWithPrefix, salt };

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

function emptyHashWithPrefix(prefix: string) {
  return salt(prefix)[0];
}

function hashWithPrefix(prefix: string, input: Field[]) {
  let init = salt(prefix);
  return Poseidon.update(init, input)[0];
}
const prefixes = Poseidon_.prefixes;

function salt(prefix: string) {
  return Poseidon_.update(
    Poseidon.initialState,
    [prefixToField(prefix)],
    // salt is never suppoesed to run in checked mode
    false
  );
}

// same as Random_oracle.prefix_to_field in OCaml
function prefixToField(prefix: string) {
  if (prefix.length * 8 >= 255) throw Error('prefix too long');
  let bits = [...prefix]
    .map((char) => {
      // convert char to 8 bits
      let bits = [];
      for (let j = 0, c = char.charCodeAt(0); j < 8; j++, c >>= 1) {
        bits.push(!!(c & 1));
      }
      return bits;
    })
    .flat();
  return Field.ofBits(bits);
}
