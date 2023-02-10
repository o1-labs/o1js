import { isReady, shutdown } from '../snarky.js';
import { AccountUpdate, Token } from './account_update.js';
import * as Mina from './mina.js';
import { expect } from 'expect';

await isReady;

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let [{ privateKey, publicKey }] = Local.testAccounts;

let parentId = Token.getId(publicKey);

/**
 * tests whether the following two account updates gives the child token permissions:
 *
 * InheritFromParent -> ParentsOwnToken
 */
let tx = await Mina.transaction(privateKey, () => {
  let parent = AccountUpdate.defaultAccountUpdate(publicKey);
  parent.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
  parent.balance.subInPlace(Mina.accountCreationFee());

  let child = AccountUpdate.defaultAccountUpdate(publicKey, parentId);
  child.body.mayUseToken = AccountUpdate.MayUseToken.ParentsOwnToken;

  AccountUpdate.attachToTransaction(parent);
  parent.approve(child);
});

// according to this test, the child doesn't get token permissions
expect(tx.send()).rejects.toThrow('Token_owner_not_caller');

shutdown();
