import { zero } from 'dist/node/lib/provable/gates.js';
import {
  SelfProof,
  Field,
  ZkProgram,
  verify,
  Proof,
  JsonProof,
  Provable,
  Empty,
  Bytes,
  PublicKey,
  Group,
  Poseidon,
  Scalar,
  UInt8,
  PrivateKey,
  initializeBindings,
} from 'o1js';

class Bytes31 extends Bytes(31) {}
const priv = PrivateKey.random();
const pub = priv.toPublicKey();

const arr = Array.from<number>({ length: 31 }).fill(255);

const message = Bytes31.from(arr);

function bytesToWord(wordBytes: UInt8[]): Field {
  return wordBytes.reduce((acc, byte, idx) => {
    const shift = 1n << BigInt(8 * idx);
    return acc.add(byte.value.mul(shift));
  }, Field.from(0));
}

function wordToBytes(word: Field, bytesPerWord = 8): UInt8[] {
  let bytes = Provable.witness(Provable.Array(UInt8, bytesPerWord), () => {
    let w = word.toBigInt();
    return Array.from({ length: bytesPerWord }, (_, k) =>
      UInt8.from((w >> BigInt(8 * k)) & 0xffn)
    );
  });
  Provable.log(bytes);
  // check decomposition
  // bytesToWord(bytes).assertEquals(word);

  return bytes;
}

const { cipherText, publicKey } = await encrypt(message, pub);
let res = await decrypt(
  {
    publicKey,
    cipherText,
  },
  priv
);
bytesToWord(message.bytes).assertEquals(res[0]);

async function encrypt(message: Bytes, otherPublicKey: PublicKey) {
  // pad message to a multiple of 31 so that we can then later append a frame bit to the message
  const bytes = message.bytes;
  const multipleOf = 31;
  let n = Math.ceil(bytes.length / multipleOf) * multipleOf;
  let padding = Array.from({ length: n - bytes.length }, () => UInt8.from(0));

  message.bytes = bytes.concat(padding);

  // convert message into chunks of 31 bytes
  const chunks = message.chunk(31);

  // key exchange
  let privateKey = Provable.witness(Scalar, () => Scalar.random());
  let publicKey = Group.generator.scale(privateKey);
  let sharedSecret = otherPublicKey.toGroup().scale(privateKey);

  await initializeBindings();
  let sponge = new Poseidon.Sponge();
  sponge.absorb(sharedSecret.x);

  // frame bits
  const zeroBit = [UInt8.from(0)];
  const oneBit = [UInt8.from(1)];

  // encryption
  let cipherText = [];
  for (let [n, chunk] of chunks.entries()) {
    if (n === chunks.length - 1) {
      // attach the one frame bit if its the last chunk
      chunk = chunk.concat(oneBit);
    } else {
      // pad with zero frame bit
      chunk = chunk.concat(zeroBit);
    }
    console.log('with bit', bytesToWord(chunk).toString());

    let keyStream = sponge.squeeze();
    let encryptedChunk = bytesToWord(chunk).add(keyStream);
    cipherText.push(encryptedChunk);

    // absorb for the auth tag (two at a time for saving permutations)
    if (n % 2 === 1) sponge.absorb(cipherText[n - 1]);
    if (n % 2 === 1 || n === chunks.length - 1) sponge.absorb(cipherText[n]);
  }

  // authentication tag
  let authenticationTag = sponge.squeeze();
  cipherText.push(authenticationTag);

  return { publicKey, cipherText };
}

async function decrypt(
  { publicKey, cipherText }: { publicKey: Group; cipherText: Field[] },
  privateKey: PrivateKey
) {
  // key exchange
  let sharedSecret = publicKey.scale(privateKey.s);
  await initializeBindings();
  let sponge = new Poseidon.Sponge();
  sponge.absorb(sharedSecret.x);
  let authenticationTag = cipherText.pop();

  // decryption
  let message = [];
  for (let i = 0; i < cipherText.length; i++) {
    let keyStream = sponge.squeeze();
    let messageChunk = cipherText[i].sub(keyStream);

    const withFrameBit = wordToBytes(messageChunk, 32);
    const frameBit = withFrameBit.pop()!;

    if (i === cipherText.length - 1) frameBit.assertEquals(1);
    else frameBit.assertEquals(0);

    message.push(bytesToWord(withFrameBit));

    if (i % 2 === 1) sponge.absorb(cipherText[i - 1]);
    if (i % 2 === 1 || i === cipherText.length - 1)
      sponge.absorb(cipherText[i]);
  }
  // authentication tag
  sponge.squeeze().assertEquals(authenticationTag!);

  return message;
}
