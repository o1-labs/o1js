import * as blake from 'blakejs';
import { Field, ProvableExtended } from '../provable/field-bigint.js';
import {
  Group,
  Scalar,
  PrivateKey,
  versionNumbers,
} from '../provable/curve-bigint.js';
import {
  HashInput,
  hashWithPrefix,
  packToFields,
  prefixes,
} from '../provable/poseidon-bigint.js';
import {
  base58,
  bitsToBytes,
  bytesToBits,
  tuple,
  withVersionNumber,
} from '../provable/binable.js';
import { versionBytes } from '../js_crypto/constants.js';

let { blake2b, blake2s } = blake.default;

export { sign, signFieldElement, Signature, NetworkId };

// let s2 =
//   'false false true false false false false true true false true false false false false false false true false true true false false true false true true false false false false true true true false true false true false true true true false true true true true true true true true true true false false false false false true true false false true true true false true true true false false true false true true true true true false true true true true true false false false true false true false true false false true true false true false false true false false false false false true true false false false false true false false true false false false true false true false true false true true true true true true false true true false false true true true true true false false false false true false true false true false true true true false true true true true true false true false false false true true false true false false false true true true true true true true false false true true true false false true false true false false false true true false true false false false true true true false true false false true true false true true false true false false true true true false false true false false false false true true true false false false true true true false false false false false false true true true false false true true true true false true true false false false false true true false false true true true false true true false true true true false true true false false true true true true true true true true false true true false true false true true true false true false true false false false true true true false false false true false true true true true true true false true false false false true false true false false false true true true false true true true false false true true false true true true true true false true true false false true true true false false true true false true true false true false false false true false false true true true false false true true false true false true false true false false true true false false true true false true false true true false false true true false true true true true false true true true true false false false true true false true false true true true true false false true false true false false false true false true true true true true true false false false false true false true false true false false false true true false true true false false false true true true false false true false true false false false true false false true true true false true true false false false true true true false false true false true false false true false true false false false true true false true true true false true false false false false true true false true false true false true false false true true true true true false true false false false true true false false false false true true false false true false false false true true true true false false true true false false false false true false false false true true false true true false true true true false false true false false true false true false false true false true true false true true true true false true true true true false false true false true false true false false false true true true false true false true false false true true true true true false true false false false true false false true true true true false true false false false true false true false true true true false true false true false true true false true false false true true false true true true true false false true false true true false true false false false false true true true false true false false false false true true false false true false false true false true true false true false false true true false false false true true true true true false true true false false true true true false true false false false false false false true true true false true false false true false false false false true true true true true true true true true true true false true true true false false true false true false false true false false false false false false false false true true false true false true false false true true true false false false false false true false false false true false false false true true false true true false true true false true false true false false false false false false true true false true false true true false false true false true true false true true false true false true true true false true false true false true true false true false false false false true true false true true true true false true false false true false false false true true false false false true true false true true true false false false false true false false false true false false false false false false false false false true false false false true true true false true true false false true true true true false true false false false true false true true false true true true false true true false true true true true true true false true false true false false true true true false false false false true false false false true false true false true false true false true true true false false false true false false false false true true true true true true false true false true true false true false true true false false true false true true false false true false false false false true true true false true false true false true true false false true true false false true true false false false true false true true false false true true true false false false false false true true false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false false';
// let bits = s2.split(' ').map((s) => s === 'true');
// let bytes = bitsToBytes(bits);
// console.log(JSON.stringify({ inputBytes: bytes }));

// let s =
//   'true false true false true true true false true true true true true false false false false false false true true false false true false true false true true true false true false true true false false false true true false true false false false false false true false false true false true false true true true false false false true false false false true false false true false true false true true true true true false true false true true false true false true false true true false false false false true false true false false true true true true false false true false true true false true false true false false false false false false true true false false false true false true false true true false true true false false true false false true true false false true false true false false true false true true false false false false false true true false false true false false false true false true true true true false true true false true false false false true false false true false true true false false false false false false true true false true false false false true false false false false false true true false true true false false false true true false false true false true true true false false false false true true false false true false false true true false false true true false true false true true true true true false false false false true false true true true false false false';
// let bits = s.split(' ').map((s) => s === 'true');
// let bytes = bitsToBytes(bits);
// console.log({ outputBytes: bytes });

const networkIdMainnet = 0x01;
const networkIdTestnet = 0x00;
type NetworkId = 'mainnet' | 'testnet';
type Signature = { r: Field; s: Scalar };

const BinableSignature = withVersionNumber(
  tuple([Field, Scalar]),
  versionNumbers.signature
);
const BinableBase58 = base58(BinableSignature, versionBytes.signature);

const Signature = {
  toBase58({ r, s }: Signature) {
    return BinableBase58.toBase58([r, s]);
  },
  fromBase58(signatureBase58: string): Signature {
    let [r, s] = BinableBase58.fromBase58(signatureBase58);
    return { r, s };
  },
};

function signFieldElement(
  message: Field,
  privateKey: PrivateKey,
  networkId: NetworkId
) {
  return sign({ fields: [message] }, privateKey, networkId);
}

function sign(
  message: HashInput,
  privateKey: PrivateKey,
  networkId: NetworkId
): Signature {
  let publicKey = Group.scale(Group.one, privateKey);
  let kPrime = deriveNonce(message, publicKey, privateKey, networkId);
  console.log(kPrime);
  if (Scalar.equal(kPrime, 0n)) throw Error('sign: derived nonce is 0');
  let { x: r, y: ry } = Group.scale(Group.one, kPrime);
  let isEven = !(ry & 1n);
  let k = isEven ? kPrime : Scalar.negate(kPrime);
  console.log(r);
  let e = hashMessage(message, publicKey, r, networkId);
  console.log(e);
  let s = Scalar.add(k, Scalar.mul(e, privateKey));
  return { r, s };
}

function deriveNonce(
  message: HashInput,
  publicKey: Group,
  privateKey: Scalar,
  networkId: NetworkId
): Scalar {
  let { x, y } = publicKey;
  let d = Field.fromBits(Scalar.toBits(privateKey));
  let idByte = networkId === 'mainnet' ? networkIdMainnet : networkIdTestnet;
  let id = bytesToBits([idByte]);
  let input = HashInput.append(message, {
    fields: [x, y, d],
    packed: [[Field.fromBits(id), id.length]],
  });
  let packedInput = packToFields(input);
  let inputBits = packedInput.map(Field.toBits).flat();
  let inputBytes = bitsToBytes(inputBits);
  let bytes = blake2b(Uint8Array.from(inputBytes), undefined, 32);
  // drop the top two bits to convert into a scalar field element
  // (creates negligible bias because q = 2^254 + eps, eps << q)
  bytes[bytes.length - 1] &= 0x3f;
  return Scalar.fromBytes([...bytes]);
}

function hashMessage(
  message: HashInput,
  publicKey: Group,
  r: Field,
  networkId: NetworkId
): Scalar {
  let { x, y } = publicKey;
  let input = HashInput.append(message, { fields: [x, y, r] });
  let prefix =
    networkId === 'mainnet'
      ? prefixes.signatureMainnet
      : prefixes.signatureTestnet;
  let digest = hashWithPrefix(prefix, packToFields(input));
  console.log({ digest });
  return Scalar.fromBits(Field.toBits(digest));
}
