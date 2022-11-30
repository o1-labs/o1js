import { blake2b } from 'blakejs';
import { Field } from '../provable/field-bigint.js';
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
  bitsToBytes,
  bytesToBits,
  tuple,
  withVersionNumber,
} from '../provable/binable.js';
import { base58 } from '../provable/base58.js';
import { versionBytes } from '../js_crypto/constants.js';

export { sign, signFieldElement, Signature, NetworkId };

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
  if (Scalar.equal(kPrime, 0n)) throw Error('sign: derived nonce is 0');
  let { x: r, y: ry } = Group.scale(Group.one, kPrime);
  let isEven = !(ry & 1n);
  let k = isEven ? kPrime : Scalar.negate(kPrime);
  let e = hashMessage(message, publicKey, r, networkId);
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
  return Scalar.fromBits(Field.toBits(digest));
}
