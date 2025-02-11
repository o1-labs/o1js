import { test } from './fixtures/on-chain-state-mgmt-zkapp.js';

test.describe('On-Chain State Management zkApp UI', () => {
  test('should load page and initialize o1js', async ({
    onChainStateMgmtZkAppPage,
  }) => {
    await onChainStateMgmtZkAppPage.goto();
    await onChainStateMgmtZkAppPage.checkO1jsInitialization();
  });

  test('should compile zkProgram', async ({
    onChainStateMgmtZkAppPage,
  }) => {
    await onChainStateMgmtZkAppPage.goto();
    await onChainStateMgmtZkAppPage.checkO1jsInitialization();
    await onChainStateMgmtZkAppPage.compileZkProgram();
    await onChainStateMgmtZkAppPage.checkZkProgramCompilation();
  });


  test('should fail to update account state since zkApp was not yet deployed', async ({
    onChainStateMgmtZkAppPage,
  }) => {
    test.skip(process.env.CI === 'true', 'Skipping test in CI');

    await onChainStateMgmtZkAppPage.goto();
    await onChainStateMgmtZkAppPage.checkO1jsInitialization();
    await onChainStateMgmtZkAppPage.updateZkAppState('3');
    await onChainStateMgmtZkAppPage.checkZkAppStateUpdateFailureByUnknownAccount();
  });

  test('should compile and deploy zkApp', async ({
    onChainStateMgmtZkAppPage,
  }) => {
    await onChainStateMgmtZkAppPage.goto();
    await onChainStateMgmtZkAppPage.checkO1jsInitialization();
    await onChainStateMgmtZkAppPage.compileAndDeployZkApp();
    await onChainStateMgmtZkAppPage.checkDeployedZkApp();
  });

  test('should prove transaction and update zkApp account state', async ({
    onChainStateMgmtZkAppPage,
  }) => {
    const currentAccountState = '2';
    const newAccountState = '4';

    await onChainStateMgmtZkAppPage.goto();
    await onChainStateMgmtZkAppPage.checkO1jsInitialization();
    await onChainStateMgmtZkAppPage.compileAndDeployZkApp();
    await onChainStateMgmtZkAppPage.checkDeployedZkApp();
    await onChainStateMgmtZkAppPage.updateZkAppState(newAccountState);
    await onChainStateMgmtZkAppPage.checkUpdatedZkAppState(
      currentAccountState,
      newAccountState
    );
  });

  test.skip('should re-deploy zkApp', async ({ onChainStateMgmtZkAppPage }) => {
    test.skip(process.env.CI === 'true', 'Skipping test in CI');

    const currentAccountState = '2';
    const newAccountState = '4';

    await onChainStateMgmtZkAppPage.goto();
    await onChainStateMgmtZkAppPage.checkO1jsInitialization();
    await onChainStateMgmtZkAppPage.compileAndDeployZkApp();
    await onChainStateMgmtZkAppPage.checkDeployedZkApp();
    await onChainStateMgmtZkAppPage.updateZkAppState(newAccountState);
    await onChainStateMgmtZkAppPage.checkUpdatedZkAppState(
      currentAccountState,
      newAccountState
    );
    await onChainStateMgmtZkAppPage.compileAndDeployZkApp();
    await onChainStateMgmtZkAppPage.checkDeployedZkApp();
  });

  test.skip('should fail to re-deploy zkApp by fee excess', async ({
    onChainStateMgmtZkAppPage,
  }) => {
    test.skip(process.env.CI === 'true', 'Skipping test in CI');

    await onChainStateMgmtZkAppPage.goto();
    await onChainStateMgmtZkAppPage.checkO1jsInitialization();
    await onChainStateMgmtZkAppPage.compileAndDeployZkApp();
    await onChainStateMgmtZkAppPage.checkDeployedZkApp();
    await onChainStateMgmtZkAppPage.clearEvents();
    await onChainStateMgmtZkAppPage.compileAndDeployZkApp();
    await onChainStateMgmtZkAppPage.checkZkAppDeploymentFailureByFeeExcess();
  });

  test.skip('should fail to update account state by zkApp constraint', async ({
    onChainStateMgmtZkAppPage,
  }) => {
    test.skip(process.env.CI === 'true', 'Skipping test in CI');

    let currentAccountState = '2';
    let newAccountState = '4';
    const nextAccountState = '16';

    await onChainStateMgmtZkAppPage.goto();
    await onChainStateMgmtZkAppPage.checkO1jsInitialization();
    await onChainStateMgmtZkAppPage.compileAndDeployZkApp();
    await onChainStateMgmtZkAppPage.checkDeployedZkApp();
    await onChainStateMgmtZkAppPage.updateZkAppState(newAccountState);
    await onChainStateMgmtZkAppPage.checkUpdatedZkAppState(
      currentAccountState,
      newAccountState
    );
    currentAccountState = newAccountState;
    newAccountState = '1';
    await onChainStateMgmtZkAppPage.updateZkAppState(newAccountState);
    await onChainStateMgmtZkAppPage.checkZkAppStateUpdateFailureByStateConstraint(
      currentAccountState,
      nextAccountState,
      newAccountState
    );
  });
});
