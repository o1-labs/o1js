import { test as base } from '@playwright/test';
import { OnChainStateMgmtZkAppPage } from '../pages/on-chain-state-mgmt-zkapp.js';

type OnChainStateMgmtZkAppFixture = {
  onChainStateMgmtZkAppPage: OnChainStateMgmtZkAppPage;
};

export const test = base.extend<OnChainStateMgmtZkAppFixture>({
  onChainStateMgmtZkAppPage: async ({ page }, use) => {
    await use(new OnChainStateMgmtZkAppPage(page));
  },
});
