import { Field, Poseidon, Provable, Struct, Unconstrained } from 'o1js';

export { MerkleList };

class Element extends Struct({ previousHash: Field, element: Field }) {}

const emptyHash = Field(0);
const dummyElement = Field(0);

class MerkleList {
  hash: Field;
  value: Unconstrained<Element[]>;

  private constructor(hash: Field, value: Element[]) {
    this.hash = hash;
    this.value = Unconstrained.from(value);
  }

  isEmpty() {
    return this.hash.equals(emptyHash);
  }

  static create(): MerkleList {
    return new MerkleList(emptyHash, []);
  }

  push(element: Field) {
    let previousHash = this.hash;
    this.hash = Poseidon.hash([previousHash, element]);
    Provable.asProver(() => {
      this.value.set([...this.value.get(), { previousHash, element }]);
    });
  }

  private popWitness() {
    return Provable.witness(Element, () => {
      let value = this.value.get();
      let head = value.at(-1) ?? {
        previousHash: emptyHash,
        element: dummyElement,
      };
      this.value.set(value.slice(0, -1));
      return head;
    });
  }

  pop(): Field {
    let { previousHash, element } = this.popWitness();

    let requiredHash = Poseidon.hash([previousHash, element]);
    this.hash.assertEquals(requiredHash);

    this.hash = previousHash;
    return element;
  }

  popOrDummy(): Field {
    let { previousHash, element } = this.popWitness();

    let isEmpty = this.isEmpty();
    let correctHash = Poseidon.hash([previousHash, element]);
    let requiredHash = Provable.if(isEmpty, emptyHash, correctHash);
    this.hash.assertEquals(requiredHash);

    this.hash = Provable.if(isEmpty, emptyHash, previousHash);
    return Provable.if(isEmpty, dummyElement, element);
  }
}
