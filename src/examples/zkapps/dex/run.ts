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
let doProofs = true;

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

console.log('deploy & init token contracts...');
tx = await Mina.transaction({ feePayerKey }, () => {
  // fund 2 new accounts, and fund token contracts so each can create 1 token account
  let feePayerUpdate = AccountUpdate.createSigned(feePayerKey);
  feePayerUpdate.balance.subInPlace(accountFee.mul(2));
  feePayerUpdate.send({ to: addresses.tokenX, amount: accountFee });
  feePayerUpdate.send({ to: addresses.tokenY, amount: accountFee });

  tokenX.deploy();
  tokenY.deploy();
  tokenX.init();
  tokenY.init();
});
await tx.prove();
tx.sign([keys.tokenX, keys.tokenY]);
tx.send();

console.log('deploy dex contracts...');
tx = await Mina.transaction(feePayerKey, () => {
  // fund 5 new accounts
  AccountUpdate.createSigned(feePayerKey).balance.subInPlace(
    Mina.accountCreationFee().mul(3)
  );
  dex.deploy();
  tokenX.deployZkapp(addresses.dex);
  tokenY.deployZkapp(addresses.dex);
});
await tx.prove();
tx.sign([keys.dex]);
console.log(tx.toJSON());
tx.send();
