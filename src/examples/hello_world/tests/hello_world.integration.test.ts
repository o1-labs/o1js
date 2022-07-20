import { HelloWorld } from '../hello_world';
import {
  isReady,
  shutdown,
  Mina,
  PrivateKey,
  PublicKey,
  Party,
} from '../../../../dist/server';

function setupLocalBlockchain(): PrivateKey {
  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  return Local.testAccounts[0].privateKey;
}

async function localDeploy(
  zkAppInstance: HelloWorld,
  zkAppPrivatekey: PrivateKey,
  deployerAccount: PrivateKey
) {
  const txn = await Mina.transaction(deployerAccount, () => {
    Party.fundNewAccount(deployerAccount);
    zkAppInstance.deploy({ zkappKey: zkAppPrivatekey });
  });
  await txn.send().wait();
}

describe('HelloWorld', () => {
  let deployerAccount: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey;

  beforeAll(async () => {
    await isReady;
    deployerAccount = setupLocalBlockchain();
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
  });

  afterAll(async () => {
    // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
    // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
    // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
    setTimeout(shutdown, 0);
  });

  describe('Update Contract State', () => {
    it('Generates and deploys the `HelloWorld` smart contract', async () => {});
    it('Can change state with update method', async () => {});
  });
});
