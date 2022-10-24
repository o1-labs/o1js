import {
  AccountUpdate,
  Mina,
  isReady,
  Permissions,
  PrivateKey,
} from 'snarkyjs';
import { createDex, TokenContract, addresses, keys, tokenIds } from './dex.js';
import { expect } from 'expect';

await isReady;
let doProofs = false;

let Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
Mina.setActiveInstance(Local);
let accountFee = Mina.accountCreationFee();
let [{ privateKey: feePayerKey }] = Local.testAccounts;
let tx, balances, oldBalances;
let feePayerAddress = feePayerKey.toPublicKey();

await main({
  withVesting: false,
});

async function main({ withVesting }: { withVesting: boolean }) {
  let options = withVesting ? { lockedLiquiditySlots: 2 } : undefined;
  let { Dex, DexTokenHolder, getTokenBalances } = createDex(options);

  // analyze methods for quick error feedback
  DexTokenHolder.analyzeMethods();
  Dex.analyzeMethods();

  // compile & deploy all zkApps
  console.log('compile (dex token holder)...');
  await DexTokenHolder.compile();
  console.log('compile (dex main contract)...');
  await Dex.compile();

  let tokenX = new TokenContract(addresses.tokenX);
  let tokenY = new TokenContract(addresses.tokenY);
  let dex = new Dex(addresses.dex);

  console.log('deploy & init token contracts...');
  tx = await Mina.transaction({ feePayerKey }, () => {
    // pay fees for creating 2 token contract accounts, and fund them so each can create 2 accounts themselves
    let feePayerUpdate = AccountUpdate.createSigned(feePayerKey);
    feePayerUpdate.balance.subInPlace(accountFee.mul(2));
    feePayerUpdate.send({ to: addresses.tokenX, amount: accountFee.mul(2) });
    feePayerUpdate.send({ to: addresses.tokenY, amount: accountFee.mul(2) });
    tokenX.deploy();
    tokenY.deploy();
    tokenX.init();
    tokenY.init();
  });
  await tx.prove();
  tx.sign([keys.tokenX, keys.tokenY]);
  await tx.send();
  balances = getTokenBalances();
  console.log(
    'Token contract tokens (X, Y):',
    balances.tokenContract.X,
    balances.tokenContract.Y
  );

  /**
   * # Atomic Actions 1
   *
   * Preconditions:
   *  - SC deployed with a non-writable delegate field (impossible permission)
   *
   * Actions:
   *  - User sets permissions for delegate to be edible
   *  - User changes delegate field to something
   *
   * Expected:
   *  - delegate now holds a new address
   */

  console.log('deploy dex contracts...');
  tx = await Mina.transaction(feePayerKey, () => {
    // pay fees for creating 3 dex accounts
    AccountUpdate.createSigned(feePayerKey).balance.subInPlace(
      accountFee.mul(3)
    );
    dex.deploy();
    tokenX.deployZkapp(addresses.dex, DexTokenHolder._verificationKey!);
    tokenY.deployZkapp(addresses.dex, DexTokenHolder._verificationKey!);

    // setting the setDelegate permission field to impossible
    let dexAccount = AccountUpdate.create(addresses.dex);
    AccountUpdate.setValue(dexAccount.update.permissions, {
      ...Permissions.initial(),
      setDelegate: Permissions.impossible(),
    });
    dexAccount.sign();
  });
  await tx.prove();
  tx.sign([keys.dex]);
  await tx.send();

  console.log(
    'trying to change delegate (setDelegate=impossible, should fail)'
  );
  tx = await Mina.transaction(feePayerKey, () => {
    // setting the delegate field to something, although permissions forbid it
    let dexAccount = AccountUpdate.create(addresses.dex);
    AccountUpdate.setValue(
      dexAccount.update.delegate,
      PrivateKey.random().toPublicKey()
    );
    dexAccount.sign();
  });
  await tx.prove();

  await expect(tx.sign([keys.dex]).send()).rejects.toThrow(
    /Cannot update field 'delegate'/
  );

  console.log('changing delegate permission back to normal');

  tx = await Mina.transaction(feePayerKey, () => {
    let dexAccount = AccountUpdate.create(addresses.dex);
    AccountUpdate.setValue(dexAccount.update.permissions, {
      ...Permissions.initial(),
      setDelegate: Permissions.proofOrSignature(),
    });
    dexAccount.sign();
  });
  await tx.prove();
  await tx.sign([keys.dex]).send();

  console.log('changing delegate field to a new address');

  let newDelegate = PrivateKey.random().toPublicKey();
  tx = await Mina.transaction(feePayerKey, () => {
    let dexAccount = AccountUpdate.create(addresses.dex);
    AccountUpdate.setValue(dexAccount.update.delegate, newDelegate);
    dexAccount.sign();
  });
  await tx.prove();
  await tx.sign([keys.dex]).send();

  Mina.getAccount(addresses.dex).delegate?.assertEquals(newDelegate);

  /**
   * # Atomic Actions 2
   *
   * Preconditions:
   *  - Similar to happy path (SC deployed), but changing order of transaction and updates (within one transaction)
   *
   * Actions:
   *  - Include multiple actions of different order in the same transaction
   *
   * Expected:
   *  - tx fails if the order of actions is not valid
   */

  console.log(
    'changing permission to impossible and then trying to change delegate field - in one transaction'
  );

  tx = await Mina.transaction(feePayerKey, () => {
    // changing the permission to impossible and then trying to change the delegate field

    let permissionUpdate = AccountUpdate.create(addresses.dex);
    AccountUpdate.setValue(permissionUpdate.update.permissions, {
      ...Permissions.initial(),
      setDelegate: Permissions.impossible(),
    });
    permissionUpdate.sign();

    let fieldUpdate = AccountUpdate.create(addresses.dex);
    AccountUpdate.setValue(
      fieldUpdate.update.delegate,
      PrivateKey.random().toPublicKey()
    );

    fieldUpdate.sign();
  });
  await tx.prove();
  await expect(tx.sign([keys.dex]).send()).rejects.toThrow(
    /Update_not_permitted_delegate/
  );

  /**
   * # Atomic Actions 3
   *
   * Preconditions:
   *  - Similar to happy path (SC deployed), but editing fields and changing permissions will be successful
   *
   * Actions:
   *  - Include multiple actions in one transaction
   *    edit field -> change permission back -> successful state transition
   *
   * Expected:
   *  - tx is successful and state updated
   */

  console.log('creating multiple valid account updates in one transaction');

  newDelegate = PrivateKey.random().toPublicKey();
  tx = await Mina.transaction(feePayerKey, () => {
    // changing field
    let fieldUpdate = AccountUpdate.create(addresses.dex);
    AccountUpdate.setValue(fieldUpdate.update.delegate, newDelegate);
    fieldUpdate.sign();

    // changing permissions back to impossible
    let permissionUpdate2 = AccountUpdate.create(addresses.dex);
    AccountUpdate.setValue(permissionUpdate2.update.permissions, {
      ...Permissions.initial(),
      setDelegate: Permissions.impossible(),
    });
    permissionUpdate2.sign();
  });
  await tx.prove();
  await tx.sign([keys.dex]).send();

  Mina.getAccount(addresses.dex).delegate?.assertEquals(newDelegate);
}
