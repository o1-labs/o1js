import assert from 'node:assert';
import { AccountUpdate, Lightnet, Mina, PublicKey, UInt64, fetchAccount, sendZkapp } from 'o1js';
import Client from '../mina-signer/mina-signer.js';

// live tests for transactions signed by mina-signer instead of o1js:
// 1. a simple payment
// 2. a simple zkapp transaction, with fee payer and account updates signed by mina-signer

const transactionFee = 100_000_000;
const amount = 1_000_000_000n;
const minaGraphqlEndpoint = 'http://localhost:8080/graphql';

// same network id that o1js uses by default against lightnet
let client = new Client({ network: 'devnet' });

const Remote = Mina.Network({
  mina: minaGraphqlEndpoint,
  archive: 'http://localhost:8282',
  lightnetAccountManager: 'http://localhost:8181',
});
Mina.setActiveInstance(Remote);

let senderKey = (await Lightnet.acquireKeyPair()).privateKey;
let sender = senderKey.toPublicKey();
let receiver = (await Lightnet.acquireKeyPair()).publicKey;

console.log('Test: payment signed by mina-signer');
{
  let { nonce } = await fetchNonceAndBalance(sender);
  let { balance: receiverBalance } = await fetchNonceAndBalance(receiver);

  let signed = client.signPayment(
    {
      from: sender.toBase58(),
      to: receiver.toBase58(),
      amount: amount.toString(),
      fee: transactionFee.toString(),
      nonce: nonce.toString(),
      memo: 'payment by mina-signer',
    },
    senderKey.toBase58()
  );
  assert(client.verifyPayment(signed), 'payment signature verifies');

  let hash = await sendPayment(signed);
  console.log(`payment sent: ${hash}`);

  await waitForNonce(sender, nonce + 1n);
  let { balance: newBalance } = await fetchNonceAndBalance(receiver);
  assert.strictEqual(newBalance, receiverBalance + amount, 'receiver got the payment amount');
  console.log('✅ payment was included');
}

console.log('Test: zkapp transaction signed by mina-signer');
{
  let { nonce } = await fetchNonceAndBalance(sender);
  let { balance: receiverBalance } = await fetchNonceAndBalance(receiver);

  let transaction = await Mina.transaction({ sender, fee: transactionFee }, async () => {
    let update = AccountUpdate.createSigned(sender);
    update.send({ to: receiver, amount: UInt64.from(amount) });
  });

  // not signed with o1js -- mina-signer signs both the fee payer and the sender's account update
  let signed = client.signZkappCommand(
    {
      zkappCommand: JSON.parse(transaction.toJSON()),
      feePayer: {
        feePayer: sender.toBase58(),
        fee: transactionFee.toString(),
        nonce: nonce.toString(),
        memo: 'zkapp by mina-signer',
      },
    },
    senderKey.toBase58()
  );
  assert(client.verifyZkappCommand(signed), 'zkapp command signature verifies');

  let [response, error] = await sendZkapp(JSON.stringify(signed.data.zkappCommand));
  assert(error === undefined, `sendZkapp failed: ${JSON.stringify(error)}`);
  console.log(`zkapp transaction sent: ${response?.data?.sendZkapp?.zkapp?.hash}`);

  await waitForNonce(sender, nonce + 1n);
  let { balance: newBalance } = await fetchNonceAndBalance(receiver);
  assert.strictEqual(
    newBalance,
    receiverBalance + amount,
    'receiver got the zkapp transfer amount'
  );
  console.log('✅ zkapp transaction was included');
}

// internal helpers

async function fetchNonceAndBalance(publicKey: PublicKey) {
  let { account, error } = await fetchAccount({ publicKey });
  if (error !== undefined) {
    throw Error(`failed to fetch account ${publicKey.toBase58()}: ${error.statusText}`);
  }
  return { nonce: account!.nonce.toBigint(), balance: account!.balance.toBigInt() };
}

async function waitForNonce(publicKey: PublicKey, nonce: bigint) {
  let deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    let current = (await fetchNonceAndBalance(publicKey)).nonce;
    if (current >= nonce) return;
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw Error('transaction was not included after 5 minutes');
}

async function sendPayment({ data, signature }: ReturnType<Client['signPayment']>) {
  let query = `mutation {
  sendPayment(
    input: {
      from: "${data.from}", to: "${data.to}", amount: "${data.amount}",
      fee: "${data.fee}", nonce: "${data.nonce}", memo: "${data.memo}",
      validUntil: "${data.validUntil}"
    },
    signature: { field: "${signature.field}", scalar: "${signature.scalar}" }
  ) {
    payment { hash }
  }
}`;
  let response = await fetch(minaGraphqlEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  let json = (await response.json()) as any;
  if (json.errors) throw Error(`sendPayment failed: ${JSON.stringify(json.errors)}`);
  return json.data.sendPayment.payment.hash as string;
}
