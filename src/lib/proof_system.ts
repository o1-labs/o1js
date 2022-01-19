import { Proof } from '../snarky';

export function proofSystem(target: any): any {}

export function branch(
  target: any,
  propertyName: string,
  _descriptor?: PropertyDescriptor
): any {}

export class ProofWithInput<A> {
  publicInput: A;
  proof: Proof | null;

  // TODO
  assertVerifies() {}

  constructor(publicInput: A) {
    this.publicInput = publicInput;
    this.proof = null;
  }
}
