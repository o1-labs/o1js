import {
  isReady,
  shutdown,
  Mina,
  PrivateKey,
  PublicKey,
  UInt64,
  AccountUpdate,
} from 'snarkyjs';

import { Escrow } from './escrow';

function createLocalBlockchain() {
  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);

  let deployerAccount: PrivateKey = Local.testAccounts[0].privateKey;
  let user_sk: PrivateKey = Local.testAccounts[1].privateKey;
  return [deployerAccount, user_sk];
}

async function localDeploy(
  zkAppInstance: Escrow,
  zkAppPrivatekey: PrivateKey,
  deployerAccount: PrivateKey
) {
  const tx = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    zkAppInstance.deploy({ zkappKey: zkAppPrivatekey });
    zkAppInstance.sign(zkAppPrivatekey);
  });
  await tx.send();
}

describe('Mac tests', () => {
  let user_sk: PrivateKey;
  let user_pk: PublicKey;

  let deployerAccount: PrivateKey;

  let zkAppPrivateKey: PrivateKey;
  let zkAppAddress: PublicKey;

  beforeEach(async () => {
    await isReady;
    await Escrow.compile();

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();

    [deployerAccount, user_sk] = createLocalBlockchain();
    user_pk = user_sk.toPublicKey();
  });

  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  it('should correctly deploy, deposit and withdraw from Escrow', async () => {
    // deploy
    const zkAppInstance = new Escrow(zkAppAddress);
    await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);

    // ensure the user has full balance
    Mina.getBalance(zkAppAddress).assertEquals(UInt64.from(0));
    Mina.getBalance(user_pk).assertEquals(UInt64.from(1000000000000));

    // deposit transaction
    const tx_deposit = await Mina.transaction(user_sk, () => {
      zkAppInstance.deposit(user_pk);
    });
    await tx_deposit.prove();
    await tx_deposit.sign([user_sk]);
    await tx_deposit.send();

    // amount has been moved from the user to the contract
    Mina.getBalance(zkAppAddress).assertEquals(UInt64.from(1000000));
    Mina.getBalance(user_pk).assertEquals(UInt64.from(999999000000));

    // withdraw transaction
    const tx_withdraw = await Mina.transaction(user_sk, () => {
      zkAppInstance.withdraw(user_pk);
    });
    await tx_withdraw.prove();
    await tx_withdraw.sign([user_sk]);
    await tx_withdraw.send();

    // back to initial balance
    Mina.getBalance(zkAppAddress).assertEquals(UInt64.from(0));
    Mina.getBalance(user_pk).assertEquals(UInt64.from(1000000000000));
  });
});
