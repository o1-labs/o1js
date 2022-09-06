import { Mina, Party } from 'snarkyjs';
import {
  Dex,
  DexTokenHolder,
  TokenContract,
  addresses,
  keys,
  tokenIds,
} from './dex.js';

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let [{ privateKey: feePayer }] = Local.testAccounts;

// analyze methods for quick error feedback
TokenContract.analyzeMethods(addresses.tokenX);
TokenContract.analyzeMethods(addresses.tokenY);
DexTokenHolder.analyzeMethods(addresses.dex, tokenIds.X);
DexTokenHolder.analyzeMethods(addresses.dex, tokenIds.Y);
Dex.analyzeMethods(addresses.dex);

// compile & deploy all 5 zkApps
console.log('compile (token X)...');
await TokenContract.compile(addresses.tokenX);
console.log('compile (token Y)...');
await TokenContract.compile(addresses.tokenY);
console.log('compile (dex token holder X)...');
await DexTokenHolder.compile(addresses.dex, tokenIds.X);
console.log('compile (dex token holder Y)...');
await DexTokenHolder.compile(addresses.dex, tokenIds.Y);
console.log('compile (dex main contract)...');
await Dex.compile(addresses.dex);

let tokenX = new TokenContract(addresses.tokenX);
let tokenY = new TokenContract(addresses.tokenY);
let dex = new Dex(addresses.dex);
let dexX = new DexTokenHolder(addresses.dex, tokenIds.X);
let dexY = new DexTokenHolder(addresses.dex, tokenIds.Y);

console.log('deploy (x5)...');
let tx = await Mina.transaction(feePayer, () => {
  // fund 5 new accounts
  Party.createSigned(feePayer).balance.subInPlace(
    Mina.accountCreationFee().mul(5)
  );
  tokenX.deploy();
  tokenY.deploy();
  tokenX.deployZkapp(addresses.dex);
  tokenY.deployZkapp(addresses.dex);
  dex.deploy();
});
await tx.prove();
await tx.sign([keys.tokenX, keys.tokenY, keys.dex]).send().wait();
