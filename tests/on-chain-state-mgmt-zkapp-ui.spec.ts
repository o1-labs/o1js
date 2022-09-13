import { expect, test } from '@playwright/test';
import { OnChainStateMgmtZkAppPage } from './page/on-chain-state-mgmt-zkapp-ui.js';

test.describe('On-Chain State Management zkApp UI', () => {
  test('should load page and initialize SnarkyJS', async ({ page }) => {
    const onChainStateMgmtZkApp = new OnChainStateMgmtZkAppPage(page);
    onChainStateMgmtZkApp.goto();

    await expect(onChainStateMgmtZkApp.eventsContainer).toContainText(
      'SnarkyJS initialized after'
    );
  });
});
