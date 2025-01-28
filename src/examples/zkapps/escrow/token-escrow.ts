/**
 * This example shows how to withdraw custom tokens from a zkApp.
 *
 * - Inside the zkapp, we use `this.send()` to move balance to a newly created receiver account update.
 *   - see `withdraw()` and `withdrawOptimized()`
 *   - we also have to ensure that the receiver account update inherits token permissions
 *
 * - Outside the zkapp, we pass the zkapp account update to `token.approveAccountUpdate()`
 *   - see how we call `token.approveAccountUpdate(escrow.self)` in the test below
 */
import {
  SmartContract,
  method,
  UInt64,
  AccountUpdate,
  PrivateKey,
  Mina,
  Bool,
} from 'o1js';
import { TrivialCoin } from '../dex/erc20.js';

const admin = Mina.TestPublicKey(
  PrivateKey.fromBase58('EKEs6QLnX9gpqpto6tiL3TBcd3C4xx8Pyrek9Figake1Vqov1thL')
);

class TokenEscrow extends SmartContract {
  /**
   * Method for an admin account to withdraw funds from the escrow.
   */
  @method async withdraw(amount: UInt64) {
    // only the admin can withdraw
    this.sender.getAndRequireSignature().assertEquals(admin);

    // withdraw the amount
    let receiverAU = this.send({ to: admin, amount });

    // let the receiver update inherit token permissions from this contract
    // TODO: .send() should do this automatically
    receiverAU.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
  }

  /**
   * Optimized version of `withdraw()` which reuses the account update where we require the `sender` signature
   */
  @method async withdrawOptimized(amount: UInt64) {
    // only the admin can withdraw
    let adminAU = AccountUpdate.createSigned(admin, this.tokenId); // forces admin to sign
    adminAU.body.useFullCommitment = Bool(true); // admin signs full tx so that the signature can't be reused against them

    // withdraw the amount
    this.send({ to: adminAU, amount });

    // let the receiver update inherit token permissions from this contract
    // TODO: .send() should do this automatically
    adminAU.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
  }
}

// local test

const tokenAccount = Mina.TestPublicKey(PrivateKey.random());

let Local = await Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);
let [sender, escrowAccount] = Local.testAccounts;
let token = new TrivialCoin(tokenAccount);
const tokenId = token.deriveTokenId();

// prep: deploy token

await Mina.transaction(sender, async () => {
  // deploy token contract
  await token.deploy();

  // fund the token account creation, plus send 1 MINA to it
  // so it can create the initial account which holds all tokens
  AccountUpdate.fundNewAccount(sender, 1).send({ to: token.self, amount: 1e9 });
})
  .sign([sender.key, tokenAccount.key])
  .prove()
  .send();

// prep: deploy token escrow contract, create admin account

let escrow = new TokenEscrow(escrowAccount, tokenId);

await Mina.transaction(sender, async () => {
  // fund escrow and admin account creation
  AccountUpdate.fundNewAccount(sender, 3);

  // empty account updates to create both admin accounts
  AccountUpdate.create(admin);
  let adminToken = AccountUpdate.create(admin, tokenId);

  // deploy token escrow contract (needs token approval)
  await escrow.deploy();

  // approve both token account updates
  await token.approveAccountUpdates([adminToken, escrow.self]);
})
  .sign([sender.key, escrowAccount.key])
  .prove()
  .send();

// deposit into escrow

await Mina.transaction(tokenAccount, async () => {
  await token.transfer(tokenAccount, escrowAccount, UInt64.from(1000));
})
  // note: this only needs the token account key because we happen to have minted the tokens there
  .sign([tokenAccount.key])
  .prove()
  .send();

// withdraw from escrow (creates 4 account updates)

let tx1 = await Mina.transaction(admin, async () => {
  await escrow.withdraw(UInt64.from(500));

  // token-approve the withdrawal
  await token.approveAccountUpdate(escrow.self);
})
  .sign([admin.key])
  .prove();
console.log('escrow withdraw tx', tx1.toPretty());
await tx1.send();

// withdraw from escrow (optimized, creates only 3 account updates)

let tx2 = await Mina.transaction(admin, async () => {
  await escrow.withdrawOptimized(UInt64.from(500));

  // token-approve the withdrawal
  await token.approveAccountUpdate(escrow.self);
})
  .sign([admin.key])
  .prove();
console.log('escrow withdraw tx (optimized)', tx2.toPretty());
await tx2.send();
