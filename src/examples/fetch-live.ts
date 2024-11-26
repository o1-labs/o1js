import { expect } from 'expect';
import { Lightnet, Mina, PrivateKey, UInt64, fetchAccount } from 'o1js';

const useCustomLocalNetwork = process.env.USE_CUSTOM_LOCAL_NETWORK === 'true';
Mina.setActiveInstance(configureMinaNetwork());
const transactionFee = 100_000_000;
let defaultNetworkConstants: Mina.NetworkConstants = {
  genesisTimestamp: UInt64.from(0),
  slotTime: UInt64.from(3 * 60 * 1000),
  accountCreationFee: UInt64.from(1_000_000_000),
};
const { sender } = await configureFeePayer();

await checkDefaultNetworkConstantsFetching();
await checkActualNetworkConstantsFetching();

await tearDown();

async function checkDefaultNetworkConstantsFetching() {
  console.log(
    '\nCase #1: check that default network constants can be fetched outside of the transaction scope.'
  );
  const networkConstants = Mina.getNetworkConstants();
  expect(defaultNetworkConstants).toEqual(networkConstants);
  logNetworkConstants(networkConstants);
}

async function checkActualNetworkConstantsFetching() {
  console.log(
    '\nCase #2: check that actual network constants can be fetched within the transaction scope.'
  );
  let networkConstants: Mina.NetworkConstants | undefined;
  await Mina.transaction({ sender, fee: transactionFee }, async () => {
    networkConstants = Mina.getNetworkConstants();
  });
  expect(networkConstants?.slotTime).not.toBeUndefined();
  expect(networkConstants?.genesisTimestamp).not.toBeUndefined();
  expect(defaultNetworkConstants).not.toEqual(networkConstants);
  logNetworkConstants(networkConstants);
}

function configureMinaNetwork() {
  const minaGraphQlEndpoint = useCustomLocalNetwork
    ? 'http://localhost:8080/graphql'
    : 'https://berkeley.minascan.io/graphql';
  return Mina.Network({
    mina: minaGraphQlEndpoint,
    archive: useCustomLocalNetwork
      ? 'http://localhost:8282'
      : 'https://api.minascan.io/archive/berkeley/v1/graphql',
    lightnetAccountManager: 'http://localhost:8181',
  });
}

async function configureFeePayer() {
  const senderKey = useCustomLocalNetwork
    ? (await Lightnet.acquireKeyPair()).privateKey
    : PrivateKey.random();
  const sender = senderKey.toPublicKey();
  if (!useCustomLocalNetwork) {
    console.log(`\nFunding the fee payer account.`);
    await Mina.faucet(sender);
  }
  console.log(`\nFetching the fee payer account information.`);
  const accountDetails = (await fetchAccount({ publicKey: sender })).account;
  console.log(
    `Using the fee payer account ${sender.toBase58()} with nonce: ${
      accountDetails?.nonce
    } and balance: ${accountDetails?.balance}.`
  );
  return { sender, senderKey };
}

async function tearDown() {
  const keyPairReleaseMessage = await Lightnet.releaseKeyPair({
    publicKey: sender.toBase58(),
  });
  if (keyPairReleaseMessage) console.info('\n' + keyPairReleaseMessage);
}

function logNetworkConstants(
  networkConstants: Mina.NetworkConstants | undefined
) {
  console.log(`Account creation fee: ${networkConstants?.accountCreationFee}`);
  console.log(`Slot time: ${networkConstants?.slotTime}`);
  console.log(`Genesis timestamp: ${networkConstants?.genesisTimestamp}`);
  console.log(
    `Genesis date: ${new Date(
      Number(networkConstants?.genesisTimestamp.toString() ?? '0')
    )}`
  );
}
