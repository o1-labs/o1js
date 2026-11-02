# Mina Signer

This is a NodeJS SDK that allows you to sign strings, payments, and delegations
using Mina's key pairs for various specified networks.

# Install

```bash
yarn add mina-signer
# or with npm:
npm install --save mina-signer
```

# Usage

```js
import Client from 'mina-signer';
const client = new Client({ network: 'mainnet' });

// Generate keys
let keypair = client.genKeys();
```

## Transaction era (next, Mesa and berkeley)

By default the client signs zkApp commands in the transaction format of the
network after the Mesa hard fork (`era: 'next'`), in which an account update's
`setVerificationKey` permission is a bare authorization such as `'Signature'`.
To sign for the **Mesa** format (mina-signer 4.1.0), or the older **berkeley**
format (o1js v2.9.0), pass `era`:

```js
const client = new Client({ network: 'mainnet', era: 'mesa' });
const berkeleyClient = new Client({ network: 'devnet', era: 'berkeley' });
```

Mesa and berkeley give `setVerificationKey` as `{ auth, txnVersion }`. Every
zkApp command commits to the era's permissions layout, even one that does not
set permissions, so a zkApp command signed for one era does not verify under
another.

`era` is orthogonal to `network` (any era is valid with any network) and only
affects zkApp commands — payment, delegation, string, and field signing are
identical across eras. When `era: 'berkeley'`, zkApp `appState` arrays must have
length 8 (Mesa and later use 32); a mismatch throws rather than silently
producing an invalid signature.

```js
let keypair = client.genKeys();

// Sign and verify message
let signed = client.signMessage('hello', keypair.privateKey);
if (client.verifyMessage(signed)) {
  console.log('Message was verified successfully');
}

// Sign and verify a payment
let signedPayment = client.signPayment(
  {
    to: keypair.publicKey,
    from: keypair.publicKey,
    amount: 1,
    fee: 1,
    nonce: 0,
  },
  keypair.privateKey
);
if (client.verifyPayment(signedPayment)) {
  console.log('Payment was verified successfully');
}

// Sign and verify a stake delegation
const signedDelegation = client.signStakeDelegation(
  {
    to: keypair.publicKey,
    from: keypair.publicKey,
    fee: '1',
    nonce: '0',
  },
  keypair.privateKey
);
if (client.verifyStakeDelegation(signedDelegation)) {
  console.log('Delegation was verified successfully');
}
```
