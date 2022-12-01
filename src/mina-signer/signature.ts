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
import { bitsToBytes, tuple, withVersionNumber } from '../provable/binable.js';
import { base58 } from '../provable/base58.js';
import { versionBytes } from '../js_crypto/constants.js';

export { sign, signFieldElement, Signature, NetworkId };

const networkIdMainnet = 0x01n;
const networkIdTestnet = 0x00n;
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
  let publicKey = Group.scale(Group.generatorMina, privateKey);
  let kPrime = deriveNonce(message, publicKey, privateKey, networkId);
  if (Scalar.equal(kPrime, 0n)) throw Error('sign: derived nonce is 0');
  let { x: rx, y: ry } = Group.scale(Group.generatorMina, kPrime);
  let isEven = !(ry & 1n);
  let k = isEven ? kPrime : Scalar.negate(kPrime);
  let e = hashMessage(message, publicKey, rx, networkId);
  let s = Scalar.add(k, Scalar.mul(e, privateKey));
  return { r: rx, s };
}

function deriveNonce(
  message: HashInput,
  publicKey: Group,
  privateKey: Scalar,
  networkId: NetworkId
): Scalar {
  let { x, y } = publicKey;
  let d = Field.fromBits(Scalar.toBits(privateKey));
  let id = networkId === 'mainnet' ? networkIdMainnet : networkIdTestnet;
  let input = HashInput.append(message, {
    fields: [x, y, d],
    packed: [[id, 8]],
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
