import {
  Poseidon,
  Field,
  Circuit,
  circuitMain,
  public_,
  isReady,
  Ledger,
} from 'snarkyjs';

/* Exercise 0:

Public input: a hash value h
Prove:
  I know a value x such that hash(x) = h 
*/

class Main extends Circuit {
  @circuitMain
  static main(preimage: Field, @public_ hash: Field) {
    Poseidon.hash([preimage]).assertEquals(hash);
  }
}

await isReady;

// console.log('generating keypair...');
const kp = Main.generateKeypair();

// console.dir((kp as any).value, { depth: 4 });

type Gate = {
  typ: string;
  wires: any;
  coeffs: number[][];
};

function coeffsToBigint(gate: Gate) {
  let coeffs = [];
  for (let coefficient of gate.coeffs) {
    let arr = new Uint8Array(coefficient);
    coeffs.push(bytesToBigInt(arr).toString());
  }
  return { typ: gate.typ, wires: gate.wires, coeffs };
}

let cs: { gates: Gate[] } = JSON.parse(Ledger.keypairToJson((kp as any).value));
let gates = cs.gates.map(coeffsToBigint);

console.log(JSON.stringify(gates));

function bytesToBigInt(bytes: Uint8Array) {
  let x = 0n;
  let bitPosition = 0n;
  for (let byte of bytes) {
    x += BigInt(byte) << bitPosition;
    bitPosition += 8n;
  }
  return x;
}
