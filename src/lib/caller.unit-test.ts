import { AccountUpdate, TokenId } from './account-update.js';
import * as Mina from './mina.js';
import { expect } from 'expect';

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let [{ privateKey, publicKey }] = Local.testAccounts;

let parentId = TokenId.derive(publicKey);

/**
 * tests whether the following two account updates gives the child token permissions:
 *
 * InheritFromParent -> ParentsOwnToken
 */
let tx = await Mina.transaction(privateKey, async () => {
  let parent = AccountUpdate.defaultAccountUpdate(publicKey);
  parent.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
  parent.balance.subInPlace(Mina.getNetworkConstants().accountCreationFee);

  let child = AccountUpdate.defaultAccountUpdate(publicKey, parentId);
  child.body.mayUseToken = AccountUpdate.MayUseToken.ParentsOwnToken;

  AccountUpdate.attachToTransaction(parent);
  parent.approve(child);
});

// according to this test, the child doesn't get token permissions
await expect(tx.send()).rejects.toThrow(
  'can not use or pass on token permissions'
);
