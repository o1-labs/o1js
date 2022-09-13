import { expect, type Locator, type Page } from '@playwright/test';

export class OnChainStateMgmtZkAppPage {
  readonly page: Page;
  readonly eventsContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.eventsContainer = page.locator('span[id="eventsContainer"]');
  }

  async goto() {
    await this.page.goto('/on-chain-state-mgmt-zkapp-ui.html');
  }

  // async getStarted() {
  //   await this.getStartedLink.first().click();
  //   await expect(this.gettingStartedHeader).toBeVisible();
  // }

  // async pageObjectModel() {
  //   await this.getStarted();
  //   await this.pomLink.click();
  // }
}
