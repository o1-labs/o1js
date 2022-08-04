import { Field, Ledger, Encoding } from 'snarkyjs';

let tokenId = Field.random();

let encoded1 = Ledger.fieldToBase58(tokenId);
let encoded2 = Encoding.TokenId.toBase58(tokenId);

console.log('ENCODED:');
console.log(encoded1 === encoded2);
console.log(encoded1);
console.log(encoded2);
console.log('---------------------------');
console.log('DECODED');
let decoded = Encoding.TokenId.fromBase58(encoded2);
console.log(decoded.toBigInt() === tokenId.toBigInt());
console.log(decoded.toBigInt());
console.log(tokenId.toBigInt());
console.log('---------------------------');

let receiptChainHash = Field.random();
let encodedHash2 = Encoding.ReceiptChainHash.toBase58(receiptChainHash);
let receiptChainHash2 = Encoding.ReceiptChainHash.fromBase58(encodedHash2);
console.log(receiptChainHash.toString() === receiptChainHash2.toString());

console.log('default token id', Ledger.fieldToBase58(Field.one));
console.log('default token id', Encoding.TokenId.toBase58(Field.one));
