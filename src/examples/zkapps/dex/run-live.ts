import { expect } from 'expect';
import {
  AccountUpdate,
  Lightnet,
  Mina,
  PrivateKey,
  UInt64,
  fetchAccount,
} from 'o1js';
import os from 'os';
import { tic, toc } from '../../utils/tic-toc.node.js';
import {
  Dex,
  DexTokenHolder,
  addresses,
  keys,
  tokenIds,
} from './dex-with-actions.js';
import { TrivialCoin as TokenContract } from './erc20.js';

const useCustomLocalNetwork = process.env.USE_CUSTOM_LOCAL_NETWORK === 'true';
// setting this to a higher number allows you to skip a few transactions, to pick up after an error
const successfulTransactions = 0;

tic('Run DEX with actions, happy path, against real network.');
console.log();
const network = Mina.Network({
  mina: useCustomLocalNetwork
    ? 'http://localhost:8080/graphql'
    : 'https://berkeley.minascan.io/graphql',
  archive: useCustomLocalNetwork
    ? 'http://localhost:8282'
    : 'https://api.minascan.io/archive/berkeley/v1/graphql',
  lightnetAccountManager: 'http://localhost:8181',
});
Mina.setActiveInstance(network);

let tx, pendingTx: Mina.PendingTransaction, balances, oldBalances;

// compile contracts & wait for fee payer to be funded
const senderKey = useCustomLocalNetwork
  ? (await Lightnet.acquireKeyPair()).privateKey
  : PrivateKey.random();
const sender = senderKey.toPublicKey();
if (!useCustomLocalNetwork) {
  console.log(`Funding the fee payer account.`);
  await ensureFundedAccount(senderKey.toBase58());
}

await TokenContract.analyzeMethods();
await DexTokenHolder.analyzeMethods();
await Dex.analyzeMethods();

tic('compile (token)');
await TokenContract.compile();
toc();
tic('compile (dex token holder)');
await DexTokenHolder.compile();
toc();
tic('compile (dex main contract)');
await Dex.compile();
toc();

let tokenX = new TokenContract(addresses.tokenX);
let tokenY = new TokenContract(addresses.tokenY);
let dex = new Dex(addresses.dex);
let dexTokenHolderX = new DexTokenHolder(addresses.dex, tokenIds.X);
let dexTokenHolderY = new DexTokenHolder(addresses.dex, tokenIds.Y);

let senderSpec = { sender, fee: 0.1e9 };
let userSpec = { sender: addresses.user, fee: 0.1e9 };

if (successfulTransactions <= 0) {
  tic('deploy & init token contracts');
  tx = await Mina.transaction(senderSpec, async () => {
    await tokenX.deploy();
    await tokenY.deploy();

    // pay fees for creating 2 token contract accounts, and fund them so each can create 1 account themselves
    const accountFee = Mina.getNetworkConstants().accountCreationFee;
    let feePayerUpdate = AccountUpdate.fundNewAccount(sender, 2);
    feePayerUpdate.send({ to: tokenX.self, amount: accountFee });
    feePayerUpdate.send({ to: tokenY.self, amount: accountFee });
  });
  await tx.prove();
  pendingTx = await tx.sign([senderKey, keys.tokenX, keys.tokenY]).send();
  toc();
  console.log('account updates length', tx.transaction.accountUpdates.length);
  logPendingTransaction(pendingTx);
  tic('waiting');
  await pendingTx.wait();
  await sleep(10);
  toc();
}

if (successfulTransactions <= 1) {
  tic('deploy dex contracts');
  tx = await Mina.transaction(senderSpec, async () => {
    // pay fees for creating 3 dex accounts
    AccountUpdate.createSigned(sender).balance.subInPlace(
      Mina.getNetworkConstants().accountCreationFee.mul(3)
    );
    await dex.deploy();
    await dexTokenHolderX.deploy();
    await tokenX.approveAccountUpdate(dexTokenHolderX.self);
    await dexTokenHolderY.deploy();
    await tokenY.approveAccountUpdate(dexTokenHolderY.self);
  });
  await tx.prove();
  pendingTx = await tx.sign([senderKey, keys.dex]).send();
  toc();
  console.log('account updates length', tx.transaction.accountUpdates.length);
  logPendingTransaction(pendingTx);
  tic('waiting');
  await pendingTx.wait();
  await sleep(10);
  toc();
}

let USER_DX = 1_000n;

if (successfulTransactions <= 2) {
  tic('transfer tokens to user');
  tx = await Mina.transaction(senderSpec, async () => {
    // pay fees for creating 3 user accounts
    let feePayer = AccountUpdate.fundNewAccount(sender, 3);
    feePayer.send({ to: addresses.user, amount: 8e9 }); // give users MINA to pay fees
    await tokenX.transfer(
      addresses.tokenX,
      addresses.user,
      UInt64.from(USER_DX)
    );
    await tokenY.transfer(
      addresses.tokenY,
      addresses.user,
      UInt64.from(USER_DX)
    );
  });
  await tx.prove();
  pendingTx = await tx.sign([senderKey, keys.tokenX, keys.tokenY]).send();
  toc();
  console.log('account updates length', tx.transaction.accountUpdates.length);
  logPendingTransaction(pendingTx);
  tic('waiting');
  await pendingTx.wait();
  await sleep(10);
  toc();
}

if (successfulTransactions <= 3) {
  // this is done in advance to avoid account update limit in `supply`
  tic("create user's lq token account");
  tx = await Mina.transaction(userSpec, async () => {
    AccountUpdate.fundNewAccount(addresses.user);
    await dex.createAccount();
  });
  await tx.prove();
  pendingTx = await tx.sign([keys.user]).send();
  toc();
  console.log('account updates length', tx.transaction.accountUpdates.length);
  logPendingTransaction(pendingTx);
  tic('waiting');
  await pendingTx.wait();
  await sleep(10);
  toc();

  [oldBalances, balances] = [balances, await getTokenBalances()];
  expect(balances.user.X).toEqual(USER_DX);
  console.log(balances);
}

if (successfulTransactions <= 4) {
  tic('supply liquidity');
  tx = await Mina.transaction(userSpec, async () => {
    await dex.supplyLiquidityBase(UInt64.from(USER_DX), UInt64.from(USER_DX));
  });
  await tx.prove();
  pendingTx = await tx.sign([keys.user]).send();
  toc();
  console.log('account updates length', tx.transaction.accountUpdates.length);
  logPendingTransaction(pendingTx);
  tic('waiting');
  await pendingTx.wait();
  await sleep(10);
  toc();

  [oldBalances, balances] = [balances, await getTokenBalances()];
  expect(balances.user.X).toEqual(0n);
  console.log(balances);
}

let USER_DL = 100n;

if (successfulTransactions <= 5) {
  tic('redeem liquidity, step 1');
  tx = await Mina.transaction(userSpec, async () => {
    await dex.redeemInitialize(UInt64.from(USER_DL));
  });
  await tx.prove();
  pendingTx = await tx.sign([keys.user]).send();
  toc();
  console.log('account updates length', tx.transaction.accountUpdates.length);
  logPendingTransaction(pendingTx);
  tic('waiting');
  await pendingTx.wait();
  await sleep(10);
  toc();

  console.log(await getTokenBalances());
}

if (successfulTransactions <= 6) {
  tic('redeem liquidity, step 2a (get back token X)');
  tx = await Mina.transaction(userSpec, async () => {
    await dexTokenHolderX.redeemLiquidityFinalize();
    await tokenX.approveAccountUpdate(dexTokenHolderX.self);
  });
  await tx.prove();
  pendingTx = await tx.sign([keys.user]).send();
  toc();
  console.log('account updates length', tx.transaction.accountUpdates.length);
  logPendingTransaction(pendingTx);
  tic('waiting');
  await pendingTx.wait();
  await sleep(10);
  toc();

  console.log(await getTokenBalances());
}

if (successfulTransactions <= 7) {
  tic('redeem liquidity, step 2b (get back token Y)');
  tx = await Mina.transaction(userSpec, async () => {
    await dexTokenHolderY.redeemLiquidityFinalize();
    await tokenY.approveAccountUpdate(dexTokenHolderY.self);
  });
  await tx.prove();
  pendingTx = await tx.sign([keys.user]).send();
  toc();
  console.log('account updates length', tx.transaction.accountUpdates.length);
  logPendingTransaction(pendingTx);
  tic('waiting');
  await pendingTx.wait();
  await sleep(10);
  toc();

  [oldBalances, balances] = [balances, await getTokenBalances()];
  expect(balances.user.X).toEqual(USER_DL / 2n);
  console.log(balances);
}

if (successfulTransactions <= 8) {
  oldBalances = await getTokenBalances();

  tic('swap 10 X for Y');
  USER_DX = 10n;
  tx = await Mina.transaction(userSpec, async () => {
    await dex.swapX(UInt64.from(USER_DX));
  });
  await tx.prove();
  pendingTx = await tx.sign([keys.user]).send();
  toc();
  console.log('account updates length', tx.transaction.accountUpdates.length);
  logPendingTransaction(pendingTx);
  tic('waiting');
  await pendingTx.wait();
  await sleep(10);
  toc();

  balances = await getTokenBalances();
  expect(balances.user.X).toEqual(oldBalances.user.X - USER_DX);
  console.log(balances);
}

toc();
console.log('dex happy path with actions was successful! 🎉');
console.log();
// Tear down
const keyPairReleaseMessage = await Lightnet.releaseKeyPair({
  publicKey: sender.toBase58(),
});
if (keyPairReleaseMessage) console.info(keyPairReleaseMessage);

async function ensureFundedAccount(privateKeyBase58: string) {
  let senderKey = PrivateKey.fromBase58(privateKeyBase58);
  let sender = senderKey.toPublicKey();
  let result = await fetchAccount({ publicKey: sender });
  let balance = result.account?.balance.toBigInt();
  if (balance === undefined || balance <= 15_000_000_000n) {
    await Mina.faucet(sender);
    await sleep(1);
  }
  return { senderKey, sender };
}

function logPendingTransaction(pendingTx: Mina.PendingTransaction) {
  if (pendingTx.status === 'rejected') throw Error('transaction failed');
  console.log(
    'tx sent: ' +
      (useCustomLocalNetwork
        ? `file://${os.homedir()}/.cache/zkapp-cli/lightnet/explorer/<version>/index.html?target=transaction&hash=${
            pendingTx.hash
          }`
        : `https://minascan.io/berkeley/tx/${pendingTx.hash}?type=zk-tx`)
  );
}

async function getTokenBalances() {
  // fetch accounts
  await Promise.all(
    [
      { publicKey: addresses.user },
      { publicKey: addresses.user, tokenId: tokenIds.X },
      { publicKey: addresses.user, tokenId: tokenIds.Y },
      { publicKey: addresses.user, tokenId: tokenIds.lqXY },
      { publicKey: addresses.dex },
      { publicKey: addresses.dex, tokenId: tokenIds.X },
      { publicKey: addresses.dex, tokenId: tokenIds.Y },
    ].map((a) => fetchAccount(a))
  );

  let balances = {
    user: { MINA: 0n, X: 0n, Y: 0n, lqXY: 0n },
    dex: { X: 0n, Y: 0n, lqXYSupply: 0n },
  };
  let user = 'user' as const;
  try {
    balances.user.MINA =
      Mina.getBalance(addresses[user]).toBigInt() / 1_000_000_000n;
  } catch {}
  for (let token of ['X', 'Y', 'lqXY'] as const) {
    try {
      balances[user][token] = Mina.getBalance(
        addresses[user],
        tokenIds[token]
      ).toBigInt();
    } catch {}
  }
  try {
    balances.dex.X = Mina.getBalance(addresses.dex, tokenIds.X).toBigInt();
  } catch {}
  try {
    balances.dex.Y = Mina.getBalance(addresses.dex, tokenIds.Y).toBigInt();
  } catch {}
  try {
    let dex = new Dex(addresses.dex);
    balances.dex.lqXYSupply = dex.totalSupply.get().toBigInt();
  } catch {}
  return balances;
}

async function sleep(sec: number) {
  return new Promise((r) => setTimeout(r, sec * 1000));
}
