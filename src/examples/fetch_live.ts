import { expect } from 'expect';
import { Lightnet, Mina, PrivateKey, UInt64, fetchAccount } from 'o1js';

const useCustomLocalNetwork = process.env.USE_CUSTOM_LOCAL_NETWORK === 'true';
const minaGraphQlEndpoint = useCustomLocalNetwork
  ? 'http://localhost:8080/graphql'
  : 'https://berkeley.minascan.io/graphql';
const network = Mina.Network({
  mina: minaGraphQlEndpoint,
  archive: useCustomLocalNetwork
    ? 'http://localhost:8282'
    : 'https://api.minascan.io/archive/berkeley/v1/graphql',
  lightnetAccountManager: 'http://localhost:8181',
});
Mina.setActiveInstance(network);
const transactionFee = 100_000_000;

// Fee payer setup
console.log('');
const senderKey = useCustomLocalNetwork
  ? (await Lightnet.acquireKeyPair()).privateKey
  : PrivateKey.random();
const sender = senderKey.toPublicKey();
if (!useCustomLocalNetwork) {
  console.log(`Funding the fee payer account.`);
  await Mina.faucet(sender);
}
console.log(`Fetching the fee payer account information.`);
const accountDetails = (await fetchAccount({ publicKey: sender })).account;
console.log(
  `Using the fee payer account ${sender.toBase58()} with nonce: ${
    accountDetails?.nonce
  } and balance: ${accountDetails?.balance}.`
);

console.log('');
console.log(
  "Check that network constants CAN'T be fetched outside of a transaction."
);
const getNetworkConstants = () => {
  Mina.activeInstance.getNetworkConstants();
};
expect(getNetworkConstants).toThrow(
  `getNetworkConstants: Could not fetch network constants from graphql endpoint ${minaGraphQlEndpoint} outside of a transaction.`
);

console.log('');
console.log(
  'Check that network constants CAN be fetched within the transaction.'
);
let slotTime: UInt64 | undefined;
let genesisTimestamp: UInt64 | undefined;
await Mina.transaction({ sender, fee: transactionFee }, () => {
  const networkConstants = Mina.activeInstance.getNetworkConstants();
  slotTime = networkConstants.slotTime;
  genesisTimestamp = networkConstants.genesisTimestamp;
});

expect(slotTime).not.toBeUndefined();
expect(genesisTimestamp).not.toBeUndefined();

console.log(`Slot time: ${slotTime}`);
console.log(`Genesis timestamp: ${genesisTimestamp}`);
console.log(
  `Genesis date: ${new Date(Number(genesisTimestamp?.toString() ?? '0'))}`
);

// Tear down
console.log('');
const keyPairReleaseMessage = await Lightnet.releaseKeyPair({
  publicKey: sender.toBase58(),
});
if (keyPairReleaseMessage) console.info(keyPairReleaseMessage);
