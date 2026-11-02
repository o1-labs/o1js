// verifies the Mesa (mina-signer 4.1.0) era of mina-signer against golden vectors
// produced by the real mina-signer@4.1.0, and checks its dispatch against the
// default 'next' era.
import { TransactionVersion as NextTV } from '../../bindings/mina-transaction/gen/v1/transaction-bigint.js';
import Client from '../mina-signer.js';
import { TransactionVersion as MesaTV } from './mesa/transaction-bigint.js';
import { signZkappCommand, verifyZkappCommandSignature } from './sign-zkapp-command.js';
import { mesaVectors as V } from './test-vectors/mesa.js';

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
// the 'next' form of a Mesa command: setVerificationKey is a bare authorization
function withBarePermissions(command: any) {
  let c = clone(command);
  for (let au of c.accountUpdates) {
    let p = au.body.update.permissions;
    if (p) p.setVerificationKey = p.setVerificationKey.auth;
  }
  return c;
}

function run() {
  let privateKey = V.keypair.privateKey;
  let publicKey = V.keypair.publicKey;
  let network = V.network as 'testnet';

  check('mesa TransactionVersion.empty() === 4', MesaTV.empty().toString() === '4');
  check('next TransactionVersion.empty() === 5', NextTV.empty().toString() === '5');

  // ---------- Mesa zkApp signing matches @4.1.0 golden ----------
  for (let name of ['zkapp1', 'zkapp2'] as const) {
    let golden = V[name].output as any;
    let signed = signZkappCommand(clone(golden.data.zkappCommand), privateKey, network, 'mesa');
    check(
      `${name}: mesa feePayer signature matches @4.1.0`,
      signed.feePayer.authorization === golden.signature
    );
    check(
      `${name}: mesa signature verifies`,
      verifyZkappCommandSignature(signed, publicKey, network, 'mesa')
    );
  }

  let mesaClient = new Client({ network, era: 'mesa' });
  let golden2 = (V.zkapp2.output as any).data;
  let viaClient = mesaClient.signTransaction(
    { zkappCommand: clone(golden2.zkappCommand), feePayer: clone(golden2.feePayer) },
    privateKey
  );
  check(
    'zkapp2: mesa client matches @4.1.0',
    viaClient.signature === (V.zkapp2.output as any).signature
  );

  // ---------- 'next' is the default era ----------
  let defaultClient = new Client({ network });
  let nextClient = new Client({ network, era: 'next' });
  let next2 = {
    zkappCommand: withBarePermissions(golden2.zkappCommand),
    feePayer: clone(golden2.feePayer),
  };
  check(
    'default client signs as next',
    defaultClient.signTransaction(clone(next2), privateKey).signature ===
      nextClient.signTransaction(clone(next2), privateKey).signature
  );

  // ---------- the eras differ even when no permissions are set ----------
  // an update that keeps the permissions still hashes their placeholder value, so
  // every zkApp command commits to the era's permissions layout.
  let cmd1 = clone((V.zkapp1.output as any).data.zkappCommand);
  let signed1Next = signZkappCommand(cmd1, privateKey, network, 'next');
  check(
    'zkapp1: next and mesa differ even when no permissions are set',
    signed1Next.feePayer.authorization !== (V.zkapp1.output as any).signature
  );
  check(
    'zkapp1: mesa signature does not verify under next',
    !verifyZkappCommandSignature(
      clone((V.zkapp1.output as any).data.zkappCommand),
      publicKey,
      network,
      'next'
    )
  );

  // ---------- a command that sets permissions differs, and cannot cross eras ----------
  let signed2Next = signZkappCommand(
    withBarePermissions(golden2.zkappCommand),
    privateKey,
    network,
    'next'
  );
  check(
    'zkapp2: next and mesa produce different signatures when permissions are set',
    signed2Next.feePayer.authorization !== (V.zkapp2.output as any).signature
  );
  check(
    'zkapp2: next signature verifies under next',
    verifyZkappCommandSignature(signed2Next, publicKey, network, 'next')
  );

  console.log(`\nmesa.unit-test: ${pass} checks passed`);
}

run();
