import { Bool, isReady } from '../snarky.js';
import {
  AccountUpdate,
  makeChildAccountUpdate,
  Token,
} from './account_update.js';
import * as Mina from './mina.js';
import { expect } from 'expect';

await isReady;

const Call = { isDelegateCall: Bool(false) };
const DelegateCall = { isDelegateCall: Bool(true) };

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let [{ privateKey, publicKey }] = Local.testAccounts;

let parentId = Token.getId(publicKey);

/**
 * tests whether the following two account updates gives the child token permissions:
 *
 * Delegate_call -> Call
 */
let tx = await Mina.transaction(privateKey, () => {
  let parent = AccountUpdate.defaultAccountUpdate(publicKey);
  parent.body.callType = DelegateCall;
  parent.balance.subInPlace(Mina.accountCreationFee());

  let child = AccountUpdate.defaultAccountUpdate(publicKey, parentId);
  child.body.callType = Call;

  AccountUpdate.attachToTransaction(parent);
  makeChildAccountUpdate(parent, child);
});

// according to this test, the child doesn't get token permissions
expect(tx.send()).rejects.toThrow('Token_owner_not_caller');
