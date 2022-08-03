import { Field, Ledger } from 'snarkyjs';
let { versionBytes, fieldToBinaryString, toBase58 } = Ledger.encoding;

let x = Field(25);

let encoded1 = Ledger.fieldToBase58(x);

let binaryString = fieldToBinaryString(x);

console.log([...binaryString].map((c) => c.charCodeAt(0)));

let encoded2 = toBase58(binaryString, versionBytes.tokenIdKey);

console.log(encoded1);
console.log(encoded2);

let receiptChainHash = Field(56);

console.log(
  (Ledger as any).encoding.receiptChainHashToBase58(receiptChainHash)
);
console.log(encode(receiptChainHash, versionBytes.receiptChainHash));

function encode(x: Field, versionByte: number) {
  console.log({ versionByte });
  return toBase58(fieldToBinaryString(x), versionByte);
}
