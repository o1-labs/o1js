import { isReady, Mina, Party } from 'snarkyjs';
import {
  Dex,
  DexTokenHolder,
  TokenContract,
  addresses,
  keys,
  tokenIds,
} from './dex.js';

/**
 * TODOs
 *
 * - make address a variable, or make smart contract store multiple vks/provers, one per address & tokenId
 *   to fix proving for X and Y token contracts
 * - get rid of nonce increments
 *
 */

await isReady;
let doProofs = false;

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);
let accountFee = Mina.accountCreationFee();

let [{ privateKey: feePayerKey }] = Local.testAccounts;
let tx;

// analyze methods for quick error feedback
TokenContract.analyzeMethods(addresses.tokenX);
TokenContract.analyzeMethods(addresses.tokenY);
DexTokenHolder.analyzeMethods(addresses.dex, tokenIds.X);
DexTokenHolder.analyzeMethods(addresses.dex, tokenIds.Y);
Dex.analyzeMethods(addresses.dex);

if (doProofs) {
  // compile & deploy all 5 zkApps
  console.log('compile (token X)...');
  await TokenContract.compile(addresses.tokenX);
  // console.log('compile (token Y)...');
  // await TokenContract.compile(addresses.tokenY);
  console.log('compile (dex token holder X)...');
  await DexTokenHolder.compile(addresses.dex, tokenIds.X);
  // console.log('compile (dex token holder Y)...');
  // await DexTokenHolder.compile(addresses.dex, tokenIds.Y);
  console.log('compile (dex main contract)...');
  await Dex.compile(addresses.dex);
}
let tokenX = new TokenContract(addresses.tokenX);
let tokenY = new TokenContract(addresses.tokenY);
let dex = new Dex(addresses.dex);
let dexX = new DexTokenHolder(addresses.dex, tokenIds.X);
let dexY = new DexTokenHolder(addresses.dex, tokenIds.Y);

console.log('deploy (x5)...');
tx = await Mina.transaction({ feePayerKey, fee: accountFee.mul(1) }, () => {
  // fund 2 new accounts, and fund token contracts so each can create 1 token account
  let feePayerUpdate = Party.createSigned(feePayerKey);
  feePayerUpdate.balance.subInPlace(accountFee.mul(3));
  feePayerUpdate.send({ to: addresses.tokenX, amount: accountFee });
  feePayerUpdate.send({ to: addresses.tokenY, amount: accountFee });

  tokenX.deploy();
  // tokenY.deploy();
  // tokenX.deployZkapp(addresses.dex);
  // tokenY.deployZkapp(addresses.dex);
  dex.deploy();

  // initialize tokens
  // tokenX.init();
  // tokenY.init();
});

await tx.prove();
tx.sign([keys.tokenX, keys.tokenY, keys.dex]);
console.log(tx.toJSON());
tx.send();

console.log('deploy tokens...');
tx = await Mina.transaction(feePayerKey, () => {
  // fund 5 new accounts
  Party.createSigned(feePayerKey).balance.subInPlace(
    Mina.accountCreationFee().mul(1)
  );
  // initialize tokens
  tokenX.init();
  if (!doProofs) tokenX.sign();
  // tokenY.init();

  // tokenX.deploy();
  // tokenY.deploy();
  tokenX.deployZkapp(addresses.dex);
  if (!doProofs) tokenX.sign();
  // tokenY.deployZkapp(addresses.dex);
  // dex.deploy();
});
console.log(tx.toJSON());

await tx.prove();
tx.sign([keys.dex, keys.tokenX]);
tx.send();
