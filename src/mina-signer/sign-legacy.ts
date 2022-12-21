import { UInt32, UInt64 } from '../provable/field-bigint.js';
import { PrivateKey, PublicKey } from '../provable/curve-bigint.js';
import { HashInputLegacy } from 'src/provable/poseidon-bigint.js';
import { Memo } from './memo.js';
import { NetworkId, Signature, signLegacy } from './signature.js';

export { signUserCommand };

type Tag = 'Payment' | 'StakeDelegation';

type Common = {
  fee: UInt64;
  feePayer: PublicKey;
  nonce: UInt32;
  validUntil: UInt32;
  memo: string;
};

type Body = {
  tag: Tag;
  source: PublicKey;
  receiver: PublicKey;
  amount: UInt64;
};

type UserCommand = { common: Common; body: Body };

function signUserCommand(
  command: UserCommand,
  privateKeyBase58: string,
  networkId: NetworkId
) {
  let input = toInputLegacy(command);
  let privateKey = PrivateKey.fromBase58(privateKeyBase58);
  let signature = signLegacy(input, privateKey, networkId);
  return Signature.toBase58(signature);
}

function toInputLegacy({ common, body }: UserCommand) {
  return HashInputLegacy.append(
    commonToInputLegacy(common),
    bodyToInputLegacy(body)
  );
}

// Mina_base.Transaction_union_payload.Body.to_input_legacy
function bodyToInputLegacy({ tag, source, receiver, amount }: Body) {
  return [
    tagToInput(tag),
    PublicKey.toInputLegacy(source),
    PublicKey.toInputLegacy(receiver),
    HashInputLegacy.bits(legacyTokenId),
    HashInputLegacy.bits(UInt64.toBits(amount)),
    HashInputLegacy.bits([false]), // token_locked
  ].reduce(HashInputLegacy.append);
}

// Mina_base.Signed_command_payload.Common.to_input_legacy
function commonToInputLegacy({
  fee,
  feePayer,
  nonce,
  validUntil,
  memo,
}: Common) {
  return [
    HashInputLegacy.bits(UInt64.toBits(fee)),
    HashInputLegacy.bits(legacyTokenId),
    PublicKey.toInputLegacy(feePayer),
    HashInputLegacy.bits(UInt32.toBits(nonce)),
    HashInputLegacy.bits(UInt32.toBits(validUntil)),
    HashInputLegacy.bits(Memo.toBits(memo)),
  ].reduce(HashInputLegacy.append);
}

function tagToInput(tag: Tag) {
  let int = { Payment: 0, StakeDelegation: 1 }[tag];
  let bits = [int & 4, int & 2, int & 1].map(Boolean);
  return HashInputLegacy.bits(bits);
}
const legacyTokenId = [true, ...Array<boolean>(63).fill(false)];
