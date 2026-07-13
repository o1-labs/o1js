// verifies the berkeley (o1js v2.9.0) era of mina-signer against golden vectors
// produced by the real mina-signer@3.0.7, and checks era coexistence / dispatch.
import Client from '../mina-signer.js';
import { signZkappCommand, verifyZkappCommandSignature } from './sign-zkapp-command.js';
import { AccountUpdate as BerkeleyAU, TransactionVersion as BerkeleyTV } from './berkeley/transaction-bigint.js';
import { AccountUpdate as MesaAU, TransactionVersion as MesaTV } from '../../bindings/mina-transaction/gen/v1/transaction-bigint.js';
import { berkeleyVectors as V } from './test-vectors/berkeley.js';

export { run };

let pass = 0;
function check(name: string, cond: boolean) {
  if (!cond) throw Error(`FAIL: ${name}`);
  pass++;
  console.log(`  ok: ${name}`);
}
function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function run() {
  let privateKey = V.keypair.privateKey;
  let publicKey = V.keypair.publicKey;
  let network = V.network as 'testnet';

  // ---------- US-003: eras coexist with independent layout values ----------
  let bEmpty: any = BerkeleyAU.empty();
  let mEmpty: any = MesaAU.empty();
  check('berkeley empty appState length is 8', bEmpty.body.update.appState.length === 8);
  check('mesa empty appState length is 32', mEmpty.body.update.appState.length === 32);
  // empty() leaves permissions unset (Option = none), so txnVersion is checked directly
  // on the leaf. it bites the commitment only when permissions.setVerificationKey is present
  // (exercised by the zkapp2 golden vector below); appState padding is the fee-payer delta.
  check('berkeley TransactionVersion.empty() === 3', BerkeleyTV.empty().toString() === '3');
  check('mesa TransactionVersion.empty() === 4', MesaTV.empty().toString() === '4');

  // ---------- legacy surface is era-invariant AND matches @3.0.7 ----------
  let mesa = new Client({ network });
  let berkeley = new Client({ network, era: 'berkeley' });

  let payM = mesa.signPayment(V.payment.input as any, privateKey);
  let payB = berkeley.signPayment(V.payment.input as any, privateKey);
  check('payment: mesa === berkeley (era-invariant)', JSON.stringify(payM.signature) === JSON.stringify(payB.signature));
  check('payment: matches @3.0.7 golden', JSON.stringify(payM.signature) === JSON.stringify(V.payment.output.signature));

  let delM = mesa.signStakeDelegation(V.stakeDelegation.input as any, privateKey);
  let delB = berkeley.signStakeDelegation(V.stakeDelegation.input as any, privateKey);
  check('delegation: mesa === berkeley', JSON.stringify(delM.signature) === JSON.stringify(delB.signature));
  check('delegation: matches @3.0.7 golden', JSON.stringify(delM.signature) === JSON.stringify(V.stakeDelegation.output.signature));

  let msgM = mesa.signMessage(V.message.input as string, privateKey);
  let msgB = berkeley.signMessage(V.message.input as string, privateKey);
  check('message: mesa === berkeley', JSON.stringify(msgM.signature) === JSON.stringify(msgB.signature));
  check('message: matches @3.0.7 golden', JSON.stringify(msgM.signature) === JSON.stringify(V.message.output.signature));

  let fieldsIn = (V.fields.input as string[]).map((s) => BigInt(s));
  let fM = mesa.signFields(fieldsIn, privateKey);
  let fB = berkeley.signFields(fieldsIn, privateKey);
  check('fields: mesa === berkeley', fM.signature === fB.signature);
  check('fields: matches @3.0.7 golden', fM.signature === (V.fields.output.signature as string));

  // nullifier is randomized (Scalar.random) - just confirm both eras produce a valid shape
  let nullIn = (V.nullifier.input as string[]).map((s) => BigInt(s));
  let nB: any = berkeley.createNullifier(nullIn, privateKey);
  check('nullifier: berkeley produces a public.nullifier point', nB?.public?.nullifier?.x !== undefined);

  // ---------- US-004: berkeley zkApp signing matches @3.0.7 golden ----------
  // re-sign the (signed) golden command; signing is deterministic and overwrites authorizations.
  let cmd1 = clone((V.zkapp1.output as any).data.zkappCommand);
  let signed1 = signZkappCommand(cmd1, privateKey, network, 'berkeley');
  check('zkapp1: berkeley feePayer signature matches @3.0.7', signed1.feePayer.authorization === (V.zkapp1.output as any).signature);
  check('zkapp1: berkeley signature verifies', verifyZkappCommandSignature(signed1, publicKey, network, 'berkeley'));

  let cmd2 = clone((V.zkapp2.output as any).data.zkappCommand);
  let signed2 = signZkappCommand(cmd2, privateKey, network, 'berkeley');
  check('zkapp2: berkeley feePayer signature matches @3.0.7', signed2.feePayer.authorization === (V.zkapp2.output as any).signature);
  check('zkapp2: berkeley signature verifies', verifyZkappCommandSignature(signed2, publicKey, network, 'berkeley'));

  // ---------- POSITIVE DELTA: same input, berkeley != mesa ----------
  let cmd1Mesa = clone((V.zkapp1.output as any).data.zkappCommand);
  let signed1Mesa = signZkappCommand(cmd1Mesa, privateKey, network, 'mesa');
  check(
    'positive delta: berkeley and mesa produce different signatures for the same zkApp command',
    signed1Mesa.feePayer.authorization !== signed1.feePayer.authorization
  );
  // and a berkeley signature must NOT verify under mesa
  check('berkeley signature does not verify under mesa', !verifyZkappCommandSignature(signed1, publicKey, network, 'mesa'));

  // ---------- cross-era misuse guard (berkeley requires appState length 8) ----------
  let mesaShaped = clone((V.zkapp1.output as any).data.zkappCommand);
  mesaShaped.accountUpdates[0].body.update.appState = Array(32).fill(null);
  let threw = false;
  try {
    signZkappCommand(mesaShaped, privateKey, network, 'berkeley');
  } catch {
    threw = true;
  }
  check('cross-era guard: length-32 appState rejected by berkeley client', threw);

  // a length-8 appState (or omitted) is accepted by berkeley
  let okShaped = clone((V.zkapp1.output as any).data.zkappCommand);
  okShaped.accountUpdates[0].body.update.appState = Array(8).fill(null);
  let okThrew = false;
  try {
    signZkappCommand(okShaped, privateKey, network, 'berkeley');
  } catch {
    okThrew = true;
  }
  check('cross-era guard: length-8 appState accepted by berkeley client', !okThrew);

  // mesa stays permissive (length-8 accountUpdateExample-style input must still work)
  let mesaPermissive = clone((V.zkapp1.output as any).data.zkappCommand);
  mesaPermissive.accountUpdates[0].body.update.appState = Array(8).fill(null);
  let mesaThrew = false;
  try {
    signZkappCommand(mesaPermissive, privateKey, network, 'mesa');
  } catch {
    mesaThrew = true;
  }
  check('mesa stays permissive: length-8 appState accepted (no regression)', !mesaThrew);

  console.log(`\nberkeley.unit-test: ${pass} checks passed`);
}

run();
