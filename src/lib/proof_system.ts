import { Proof } from "../snarky";

export function proofSystem(
  target: any,
): any {
  throw ''
}

export function branch(
  target: any,
  propertyName: string,
  _descriptor?: PropertyDescriptor
): any {
  throw ''
}

export class ProofWithInput<A> {
  publicInput: A
  proof: Proof | null;

  constructor(publicInput: A) {
    this.publicInput = publicInput;
    this.proof = null;
  }
}

