# Test Signer CLI

Command-line helper for drafting, signing, and broadcasting Mina payments via
the public GraphQL API. It wraps the `mina-test-signer` library so you can submit
transactions without wiring up a full wallet or SDK.

## Getting Started

- **Prerequisites:** Node.js 18+ (for native `fetch`) and npm.
- **Install dependencies:** `npm install`
- **Quick run:**
  `node mina-test-signer.js <private_key> <recipient_address> [graphql_url] [nonce]`

The optional `graphql_url` flag lets you override the default target defined in
`config.js`.

## Workflow

1. `mina-test-signer.js` parses CLI arguments and wires the supporting services.
2. `graphql-client.js` sends the signed payload to the Mina daemon and can check
   whether the transaction reached the pool.
3. `utils.js` provides small helpers for GraphQL string construction and CLI
   validation.
4. `config.js` centralises network defaults and usage messaging.

Check the console output for a transaction id; you can re-run the pool check or
the `getPooledUserCommands` helper to confirm inclusion. Provide a `nonce`
argument when you need to synchronise with on-chain account state manually. The
CLI prints emoji-enhanced step logs and a summary table so you can spot
successes and failures at a glance. GraphQL errors (including malformed
responses) cause the CLI to exit with a non-zero status so they can be surfaced
in scripts and CI.

## Private key format

For clarity, private key is in output format of:

```
  mina advanced dump-keypair --privkey-path ...
```

## Safety Notes

- Treat private keys in plain text with care. Prefer environment variables or a
  secure secrets manager for real deployments.