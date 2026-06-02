import assert from 'node:assert';
import {
  AccountUpdate,
  AccountUpdateForest,
  Mina,
  Permissions,
  PrivateKey,
  TokenContract,
  UInt64,
  method,
} from 'o1js';

/**
 * Basic token contract that does NOT set permissions in init().
 * deploy() should upgrade access from none() to proofOrSignature().
 */
class BasicTokenContract extends TokenContract {
  @method
  async approveBase(updates: AccountUpdateForest) {
    this.checkZeroBalanceChange(updates);
  }
}

/**
 * Token contract that sets custom (stricter) permissions in init().
 * deploy() must preserve these and not overwrite them with defaults.
 */
class CustomPermissionsTokenContract extends TokenContract {
  @method
  async approveBase(updates: AccountUpdateForest) {
    this.checkZeroBalanceChange(updates);
  }

  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      setPermissions: Permissions.impossible(),
      setVerificationKey: Permissions.VerificationKey.impossibleDuringCurrentVersion(),
      send: Permissions.proof(),
      editState: Permissions.proof(),
    });
  }
}

/**
 * Token contract that sets access to proof() in init() (stronger than proofOrSignature).
 * deploy() should preserve this stronger permission.
 */
class StrictAccessTokenContract extends TokenContract {
  @method
  async approveBase(updates: AccountUpdateForest) {
    this.checkZeroBalanceChange(updates);
  }

  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      access: Permissions.proof(),
    });
  }
}

/**
 * Token contract that sets access to impossible() in init().
 * deploy() must preserve this and not downgrade it to proofOrSignature().
 */
class ImpossibleAccessTokenContract extends TokenContract {
  @method
  async approveBase(updates: AccountUpdateForest) {
    this.checkZeroBalanceChange(updates);
  }

  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      access: Permissions.impossible(),
    });
  }
}

let Local = await Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);
let [sender] = Local.testAccounts;

// Test 1: Basic deploy sets access to proofOrSignature
{
  let { publicKey, privateKey } = PrivateKey.randomKeypair();
  let token = new BasicTokenContract(publicKey);

  let tx = await Mina.transaction(sender, async () => {
    AccountUpdate.fundNewAccount(sender);
    await token.deploy();
  });
  await tx.prove();
  await tx.sign([privateKey, sender.key]).send();

  let account = Mina.getAccount(publicKey);
  let access = account.permissions.access;

  // access should be proofOrSignature: constant=false, signatureNecessary=false, signatureSufficient=true
  assert(
    !access.constant.toBoolean() &&
      !access.signatureNecessary.toBoolean() &&
      access.signatureSufficient.toBoolean(),
    'basic deploy should set access to proofOrSignature'
  );
  console.log('✓ basic deploy sets access to proofOrSignature');
}

// Test 2: Custom permissions set in init() are preserved after deploy
{
  let { publicKey, privateKey } = PrivateKey.randomKeypair();
  let token = new CustomPermissionsTokenContract(publicKey);

  let tx = await Mina.transaction(sender, async () => {
    AccountUpdate.fundNewAccount(sender);
    await token.deploy();
  });
  await tx.prove();
  await tx.sign([privateKey, sender.key]).send();

  let account = Mina.getAccount(publicKey);
  let perms = account.permissions;

  // access should be proofOrSignature (upgraded from none by deploy)
  assert(
    !perms.access.constant.toBoolean() &&
      !perms.access.signatureNecessary.toBoolean() &&
      perms.access.signatureSufficient.toBoolean(),
    'access should be proofOrSignature'
  );

  // setPermissions should be impossible (set in init, must NOT be overwritten)
  // impossible: constant=true, signatureNecessary=true, signatureSufficient=false
  assert(
    perms.setPermissions.constant.toBoolean() &&
      perms.setPermissions.signatureNecessary.toBoolean() &&
      !perms.setPermissions.signatureSufficient.toBoolean(),
    'setPermissions should be impossible (preserved from init)'
  );

  // send should be proof (set in init, must NOT be overwritten to default)
  // proof: constant=false, signatureNecessary=false, signatureSufficient=false
  assert(
    !perms.send.constant.toBoolean() &&
      !perms.send.signatureNecessary.toBoolean() &&
      !perms.send.signatureSufficient.toBoolean(),
    'send should be proof (preserved from init)'
  );

  console.log('✓ custom permissions from init() are preserved after deploy');
}

// Test 3: Stronger access permission (proof) set in init() is preserved
{
  let { publicKey, privateKey } = PrivateKey.randomKeypair();
  let token = new StrictAccessTokenContract(publicKey);

  let tx = await Mina.transaction(sender, async () => {
    AccountUpdate.fundNewAccount(sender);
    await token.deploy();
  });
  await tx.prove();
  await tx.sign([privateKey, sender.key]).send();

  let account = Mina.getAccount(publicKey);
  let access = account.permissions.access;

  // access should be proof (stronger than proofOrSignature, must not be downgraded)
  // proof: constant=false, signatureNecessary=false, signatureSufficient=false
  assert(
    !access.constant.toBoolean() &&
      !access.signatureNecessary.toBoolean() &&
      !access.signatureSufficient.toBoolean(),
    'access should remain proof() when set in init (not downgraded to proofOrSignature)'
  );
  console.log('✓ stronger access permission from init() is preserved');
}

// Test 4: access set to impossible() in init() is preserved in account update
// Note: we verify at the account update level because the protocol rejects
// transactions with access=impossible() (the account would be permanently unusable).
// This test confirms deploy() doesn't silently downgrade impossible() to proofOrSignature().
{
  let { publicKey } = PrivateKey.randomKeypair();
  let token = new ImpossibleAccessTokenContract(publicKey);

  // capture the access permission after deploy() runs, inside the transaction callback
  let capturedAccess:
    | { constant: boolean; signatureNecessary: boolean; signatureSufficient: boolean }
    | undefined;

  try {
    await Mina.transaction(sender, async () => {
      AccountUpdate.fundNewAccount(sender);
      await token.deploy();

      // inspect the permission on the account update body right after deploy()
      let access = token.self.body.update.permissions.value.access;
      capturedAccess = {
        constant: access.constant.toBoolean(),
        signatureNecessary: access.signatureNecessary.toBoolean(),
        signatureSufficient: access.signatureSufficient.toBoolean(),
      };
    });
  } catch {
    // transaction creation may fail because access=impossible() is rejected by the protocol
    // but we already captured the permission values above
  }

  assert(capturedAccess !== undefined, 'should have captured access permission');

  // access should still be impossible: constant=true, signatureNecessary=true, signatureSufficient=false
  assert(
    capturedAccess!.constant &&
      capturedAccess!.signatureNecessary &&
      !capturedAccess!.signatureSufficient,
    'access should remain impossible() in account update (not downgraded to proofOrSignature)'
  );
  console.log('✓ impossible access permission from init() is preserved');
}

// Test 5: Unauthorized token operations are still rejected
{
  let { publicKey, privateKey } = PrivateKey.randomKeypair();
  let token = new BasicTokenContract(publicKey);
  let other = Mina.TestPublicKey.random();

  let tx = await Mina.transaction(sender, async () => {
    AccountUpdate.fundNewAccount(sender);
    await token.deploy();
  });
  await tx.prove();
  await tx.sign([privateKey, sender.key]).send();

  // try to mint without authorization — should be rejected
  let mintTx = await Mina.transaction(sender, async () => {
    AccountUpdate.fundNewAccount(sender);
    token.internal.mint({ address: other, amount: UInt64.from(1_000_000) });
    AccountUpdate.attachToTransaction(token.self);
  });
  await assert.rejects(
    () => mintTx.sign([sender.key]).send(),
    /Update_not_permitted_access/,
    'unauthorized mint should be rejected'
  );
  console.log('✓ unauthorized token operations are still rejected');
}

console.log('\nAll TokenContract deploy permission tests passed.');
