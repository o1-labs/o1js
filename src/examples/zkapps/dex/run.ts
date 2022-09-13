import { isReady, Mina, AccountUpdate } from 'snarkyjs';
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
TokenContract.analyzeMethods();
DexTokenHolder.analyzeMethods();
Dex.analyzeMethods();

if (doProofs) {
  // compile & deploy all 5 zkApps
  console.log('compile (token)...');
  await TokenContract.compile();
  console.log('compile (dex token holder)...');
  await DexTokenHolder.compile();
  console.log('compile (dex main contract)...');
  await Dex.compile();
}
let tokenX = new TokenContract(addresses.tokenX);
let tokenY = new TokenContract(addresses.tokenY);
let dex = new Dex(addresses.dex);
let dexX = new DexTokenHolder(addresses.dex, tokenIds.X);
let dexY = new DexTokenHolder(addresses.dex, tokenIds.Y);

console.log('deploy (x5)...');
tx = await Mina.transaction({ feePayerKey, fee: accountFee.mul(1) }, () => {
  // fund 2 new accounts, and fund token contracts so each can create 1 token account
  let feePayerUpdate = AccountUpdate.createSigned(feePayerKey);
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
  AccountUpdate.createSigned(feePayerKey).balance.subInPlace(
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
