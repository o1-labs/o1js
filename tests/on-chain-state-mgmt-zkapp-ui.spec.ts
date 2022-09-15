import { test } from '@playwright/test';
import { OnChainStateMgmtZkAppPage } from './page/on-chain-state-mgmt-zkapp-ui.js';

test.describe('On-Chain State Management zkApp UI', () => {
  test('should load page and initialize SnarkyJS', async ({ page }) => {
    const onChainStateMgmtZkApp = new OnChainStateMgmtZkAppPage(page);
    await onChainStateMgmtZkApp.goto();
    await onChainStateMgmtZkApp.checkSnarkyJsInitialization();
  });

  test('should fail to update account state since zkApp was not yet deployed', async ({
    page,
  }) => {
    test.skip(Boolean(process.env.CI));

    const onChainStateMgmtZkApp = new OnChainStateMgmtZkAppPage(page);
    await onChainStateMgmtZkApp.goto();
    await onChainStateMgmtZkApp.checkSnarkyJsInitialization();
    await onChainStateMgmtZkApp.updateZkAppState('3');
    await onChainStateMgmtZkApp.checkZkAppStateUpdateFailureByUnknownAccount();
  });

  test('should compile and deploy zkApp', async ({ page }) => {
    const onChainStateMgmtZkApp = new OnChainStateMgmtZkAppPage(page);
    await onChainStateMgmtZkApp.goto();
    await onChainStateMgmtZkApp.checkSnarkyJsInitialization();
    await onChainStateMgmtZkApp.compileAndDeployZkApp();
    await onChainStateMgmtZkApp.checkDeployedZkApp();
  });

  test('should prove transaction and update zkApp account state', async ({
    page,
  }) => {
    const currentAccountState = '2';
    const newAccountState = '4';
    const onChainStateMgmtZkApp = new OnChainStateMgmtZkAppPage(page);
    await onChainStateMgmtZkApp.goto();
    await onChainStateMgmtZkApp.checkSnarkyJsInitialization();
    await onChainStateMgmtZkApp.compileAndDeployZkApp();
    await onChainStateMgmtZkApp.checkDeployedZkApp();
    await onChainStateMgmtZkApp.updateZkAppState(newAccountState);
    await onChainStateMgmtZkApp.checkUpdatedZkAppState(
      currentAccountState,
      newAccountState
    );
  });

  test('should re-deploy zkApp', async ({ page }) => {
    test.skip(Boolean(process.env.CI));

    const currentAccountState = '2';
    const newAccountState = '4';
    const onChainStateMgmtZkApp = new OnChainStateMgmtZkAppPage(page);
    await onChainStateMgmtZkApp.goto();
    await onChainStateMgmtZkApp.checkSnarkyJsInitialization();
    await onChainStateMgmtZkApp.compileAndDeployZkApp();
    await onChainStateMgmtZkApp.checkDeployedZkApp();
    await onChainStateMgmtZkApp.updateZkAppState(newAccountState);
    await onChainStateMgmtZkApp.checkUpdatedZkAppState(
      currentAccountState,
      newAccountState
    );
    await onChainStateMgmtZkApp.compileAndDeployZkApp();
    await onChainStateMgmtZkApp.checkDeployedZkApp();
  });

  test('should fail to re-deploy zkApp by fee excess', async ({ page }) => {
    test.skip(Boolean(process.env.CI));

    const onChainStateMgmtZkApp = new OnChainStateMgmtZkAppPage(page);
    await onChainStateMgmtZkApp.goto();
    await onChainStateMgmtZkApp.checkSnarkyJsInitialization();
    await onChainStateMgmtZkApp.compileAndDeployZkApp();
    await onChainStateMgmtZkApp.checkDeployedZkApp();
    await onChainStateMgmtZkApp.clearEvents();
    await onChainStateMgmtZkApp.compileAndDeployZkApp();
    await onChainStateMgmtZkApp.checkZkAppDeploymentFailureByFeeExcess();
  });

  test('should fail to update account state by zkApp constraint', async ({
    page,
  }) => {
    test.skip(Boolean(process.env.CI));

    let currentAccountState = '2';
    let newAccountState = '4';
    const nextAccountState = '16';
    const onChainStateMgmtZkApp = new OnChainStateMgmtZkAppPage(page);
    await onChainStateMgmtZkApp.goto();
    await onChainStateMgmtZkApp.checkSnarkyJsInitialization();
    await onChainStateMgmtZkApp.compileAndDeployZkApp();
    await onChainStateMgmtZkApp.checkDeployedZkApp();
    await onChainStateMgmtZkApp.updateZkAppState(newAccountState);
    await onChainStateMgmtZkApp.checkUpdatedZkAppState(
      currentAccountState,
      newAccountState
    );
    currentAccountState = newAccountState;
    newAccountState = '1';
    await onChainStateMgmtZkApp.updateZkAppState(newAccountState);
    await onChainStateMgmtZkApp.checkZkAppStateUpdateFailureByStateConstraint(
      currentAccountState,
      nextAccountState,
      newAccountState
    );
  });
});
